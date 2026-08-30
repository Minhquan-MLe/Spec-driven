import type { Pool } from 'pg'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { closePool, createPool, getConnectionString } from '../index'
import { assertSafeToMutateTestDatabase, createTestPool, resetTestTables } from './testSupport'

// Tests for the safety guard itself — the mechanism every destructive
// test-database operation (resetTestTables, seedTestFixtures) goes
// through first. Failure cases use mocked pools/env so this file never
// has to actually connect destructively to the development database;
// the two places it *does* connect to the real dev database (below) only
// ever run the guard's own read-only `SELECT current_database()` — never
// a TRUNCATE/DELETE/INSERT.

function mockPoolReturning(currentDatabase: string): { pool: Pool; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn(async (sql: string) => {
    if (typeof sql === 'string' && sql.includes('current_database')) {
      return { rows: [{ current_database: currentDatabase }], rowCount: 1 }
    }
    // If the guard ever lets a caller reach a real mutation after it
    // should have rejected, fail loudly here rather than silently
    // "succeeding" against a fake pool.
    throw new Error(`unexpected query reached the database after the guard should have rejected it: ${sql}`)
  })
  return { pool: { query } as unknown as Pool, query }
}

describe('assertSafeToMutateTestDatabase', () => {
  const testPool: Pool = createTestPool()
  let devPool: Pool | undefined

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  afterAll(async () => {
    await closePool(testPool)
    if (devPool) await closePool(devPool)
  })

  it('accepts the real, correctly configured test database', async () => {
    await expect(assertSafeToMutateTestDatabase(testPool)).resolves.toBeUndefined()
  })

  it('rejects a real connection to the development database ("agentclinic")', async () => {
    // Connects for real to DATABASE_URL, but calls ONLY the guard —
    // never resetTestTables/seedTestFixtures — so nothing more than a
    // single read-only SELECT ever runs against it.
    devPool = createPool('development')

    await expect(assertSafeToMutateTestDatabase(devPool)).rejects.toThrow(/agentclinic_test/)
  })

  it('still rejects when TEST_DATABASE_URL is misconfigured to also name "agentclinic"', async () => {
    // Reproduces the exact flaw the old check had: TEST_DATABASE_URL
    // wrongly points at the dev database, so a pool built from it
    // genuinely connects to "agentclinic" — the active database and
    // TEST_DATABASE_URL's parsed name now agree with each other, which
    // is precisely the case a same-value comparison could not catch.
    const devConnectionString = getConnectionString('development')
    vi.stubEnv('TEST_DATABASE_URL', devConnectionString)

    devPool = devPool ?? createPool('development')

    await expect(assertSafeToMutateTestDatabase(devPool)).rejects.toThrow(
      /TEST_DATABASE_URL names database "agentclinic"|DATABASE_URL names the same database/
    )
  })

  it('rejects an active database that is neither "agentclinic" nor "agentclinic_test"', async () => {
    const { pool } = mockPoolReturning('some_other_database')

    await expect(assertSafeToMutateTestDatabase(pool)).rejects.toThrow(/some_other_database/)
  })

  it('runs no destructive SQL once the guard has rejected the connection', async () => {
    const { pool, query } = mockPoolReturning('agentclinic')

    await expect(resetTestTables(pool)).rejects.toThrow()

    // Exactly one call: the guard's own SELECT current_database(). No
    // TRUNCATE (or anything else) was ever attempted.
    expect(query).toHaveBeenCalledTimes(1)
    expect(query.mock.calls[0][0]).toContain('current_database')
  })
})
