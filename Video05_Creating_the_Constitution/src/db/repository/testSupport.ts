import type { Pool } from 'pg'
import { createPool, getConnectionString } from '../index'

// Test-only helpers for the repository integration tests
// (*.integration.test.ts). Nothing here is imported by the application
// or by any migration/seed script.
//
// Every destructive function below (resetTestTables, seedTestFixtures)
// goes through assertSafeToMutateTestDatabase first — see that
// function's own comment for why a single comparison against
// TEST_DATABASE_URL was not enough.

/** Always builds a pool from TEST_DATABASE_URL — never DATABASE_URL. */
export function createTestPool(): Pool {
  return createPool('test')
}

/**
 * The one and only database name this file will ever agree to mutate.
 * Hardcoded (not read from TEST_DATABASE_URL) on purpose — see
 * assertSafeToMutateTestDatabase.
 */
const REQUIRED_TEST_DATABASE_NAME = 'agentclinic_test'

function parseDatabaseName(connectionString: string): string {
  return new URL(connectionString).pathname.replace(/^\//, '')
}

/**
 * Guards every destructive test operation in this file. Exported so it
 * can be tested directly, in isolation, without going through
 * resetTestTables/seedTestFixtures.
 *
 * The previous version of this check only compared the pool's actual
 * `current_database()` against the name *parsed from TEST_DATABASE_URL*.
 * That is not enough: if `.env` ever misconfigures TEST_DATABASE_URL to
 * point at the development database, the pool genuinely connects to
 * "agentclinic", `current_database()` genuinely returns "agentclinic",
 * and the two values agree with each other — the check passes even
 * though this is exactly the situation it exists to catch. Comparing
 * two values that can be wrong *together* proves nothing.
 *
 * This version instead checks three independent facts against a
 * hardcoded expected name, so no single misconfiguration can pass all
 * of them:
 *   1. the ACTUAL connected database (`SELECT current_database()`) must
 *      be exactly "agentclinic_test",
 *   2. TEST_DATABASE_URL's own database name must also be exactly
 *      "agentclinic_test" (not just "whatever the pool happens to be
 *      connected to"),
 *   3. DATABASE_URL's database name must be DIFFERENT from the actual
 *      connected database — i.e. the dev and test URLs cannot name the
 *      same database.
 * All three must hold. Never logs a connection string or password —
 * only database names, which are not secrets.
 */
export async function assertSafeToMutateTestDatabase(pool: Pool): Promise<void> {
  const { rows } = await pool.query<{ current_database: string }>('SELECT current_database()')
  const activeDatabaseName = rows[0].current_database

  const testUrlDatabaseName = parseDatabaseName(getConnectionString('test'))
  const devUrlDatabaseName = parseDatabaseName(getConnectionString('development'))

  const failures: string[] = []

  if (activeDatabaseName !== REQUIRED_TEST_DATABASE_NAME) {
    failures.push(
      `the active connection is to database "${activeDatabaseName}", but only "${REQUIRED_TEST_DATABASE_NAME}" is allowed`
    )
  }
  if (testUrlDatabaseName !== REQUIRED_TEST_DATABASE_NAME) {
    failures.push(
      `TEST_DATABASE_URL names database "${testUrlDatabaseName}", but only "${REQUIRED_TEST_DATABASE_NAME}" is allowed`
    )
  }
  if (devUrlDatabaseName === activeDatabaseName) {
    failures.push(
      `DATABASE_URL names the same database ("${devUrlDatabaseName}") as the active connection`
    )
  }

  if (failures.length > 0) {
    throw new Error(
      'Refusing to run a destructive test-database operation — safety check failed:\n' +
        failures.map((f) => `  - ${f}`).join('\n') +
        `\nFix .env so TEST_DATABASE_URL names "${REQUIRED_TEST_DATABASE_NAME}" and DATABASE_URL names a different database, then re-run.`
    )
  }
}

const TEST_TABLES = ['appointments', 'ailments', 'slots', 'therapies'] as const

/**
 * Empties exactly the four AgentClinic tables (child-to-parent order,
 * `CASCADE` as a second safety net) and resets their id sequences —
 * after confirming, via assertSafeToMutateTestDatabase, that this pool
 * is the test database. Call this in `beforeEach` so every test starts
 * from a clean, known slate.
 */
export async function resetTestTables(pool: Pool): Promise<void> {
  await assertSafeToMutateTestDatabase(pool)
  for (const table of TEST_TABLES) {
    await pool.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`)
  }
}

export interface TestFixtures {
  therapyIdByCategory: Record<'performance' | 'reliability' | 'integration' | 'auth' | 'other', number>
  slotIds: number[]
}

const FIXTURE_CATEGORIES = ['performance', 'reliability', 'integration', 'auth', 'other'] as const

/**
 * Inserts one therapy per category and four available slots — a small,
 * controlled fixture set the repository tests can rely on, independent
 * of whatever `db:seed`'s real data happens to look like. Also goes
 * through the same test-database check before writing anything.
 */
export async function seedTestFixtures(pool: Pool): Promise<TestFixtures> {
  await assertSafeToMutateTestDatabase(pool)

  const therapyIdByCategory = {} as TestFixtures['therapyIdByCategory']
  for (const category of FIXTURE_CATEGORIES) {
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO therapies (name, description, categories)
       VALUES ($1, $2, $3::text[])
       RETURNING id`,
      [`Fixture therapy (${category})`, 'Inserted by repository integration tests.', [category]]
    )
    therapyIdByCategory[category] = rows[0].id
  }

  const slotIds: number[] = []
  const day = 24 * 60 * 60 * 1000
  const base = Date.now()
  for (let i = 1; i <= 4; i++) {
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO slots (time_slot, taken) VALUES ($1, false) RETURNING id`,
      [new Date(base + i * day).toISOString()]
    )
    slotIds.push(rows[0].id)
  }

  return { therapyIdByCategory, slotIds }
}
