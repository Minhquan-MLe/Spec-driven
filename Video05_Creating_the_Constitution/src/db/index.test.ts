import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Tests the pool-error-listener reliability fix (Finding 1 in
// specs/2026-08-30-postgres-crud-ui/validation.md). These only ever
// construct pg.Pool objects — `new Pool()` is lazy and never actually
// opens a socket until a query/connect is made — so this file needs no
// live database and uses a clearly fake connection string throughout.

const FAKE_DATABASE_URL = 'postgresql://fakeuser:fakepassword-should-not-leak@localhost:5432/fakedb'
const FAKE_TEST_DATABASE_URL = 'postgresql://fakeuser:fakepassword-should-not-leak@localhost:5432/faketestdb'

let createPool: typeof import('./index').createPool
let getPool: typeof import('./index').getPool
let closePool: typeof import('./index').closePool

beforeEach(async () => {
  vi.stubEnv('DATABASE_URL', FAKE_DATABASE_URL)
  vi.stubEnv('TEST_DATABASE_URL', FAKE_TEST_DATABASE_URL)
  vi.resetModules()
  const mod = await import('./index')
  createPool = mod.createPool
  getPool = mod.getPool
  closePool = mod.closePool
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('pool error handling', () => {
  it('a newly created pool has an error listener registered', () => {
    const pool = createPool('development')
    expect(pool.listenerCount('error')).toBeGreaterThanOrEqual(1)
  })

  it('registers the error listener exactly once per pool instance', () => {
    const pool = createPool('development')
    expect(pool.listenerCount('error')).toBe(1)
  })

  it('handles a simulated idle-pool error instead of crashing the process', () => {
    const pool = createPool('development')
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Node's EventEmitter throws synchronously when 'error' is emitted
    // with no listener attached — this is exactly the crash Finding 1
    // describes. With the fix in place, emitting it is handled instead
    // of throwing.
    expect(() => {
      pool.emit('error', new Error('terminating connection due to administrator command'))
    }).not.toThrow()

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
  })

  it('never logs the connection string, password, or DATABASE_URL — even if the error object carries connection details', () => {
    const pool = createPool('development')
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Mimics the shape a real pg connection-terminated error carries in
    // practice (a nested `client` with connection details) to prove the
    // handler ignores everything except the message, not just that this
    // particular test's error object happens to be safe.
    const errorWithConnectionDetails = Object.assign(
      new Error('terminating connection due to administrator command'),
      {
        client: {
          connectionParameters: {
            user: 'fakeuser',
            password: 'fakepassword-should-not-leak',
            database: 'fakedb',
            connectionString: FAKE_DATABASE_URL,
          },
        },
      }
    )

    pool.emit('error', errorWithConnectionDetails)

    const logged = consoleErrorSpy.mock.calls.map((args) => args.join(' ')).join('\n')
    expect(logged).not.toContain('fakepassword-should-not-leak')
    expect(logged).not.toContain(FAKE_DATABASE_URL)
    expect(logged).not.toContain('DATABASE_URL')
    expect(logged).not.toMatch(/SELECT|INSERT|UPDATE|DELETE/i)
  })
})

describe('pool reuse and close behavior (unchanged by the fix)', () => {
  it('getPool returns the same shared instance on repeated calls', () => {
    const first = getPool()
    const second = getPool()
    expect(first).toBe(second)
  })

  it('closePool ends a pool without throwing', async () => {
    const pool = createPool('development')
    await expect(closePool(pool)).resolves.toBeUndefined()
  })

  it('createPool still throws a clear error (not a crash) when the env var is missing', () => {
    vi.stubEnv('DATABASE_URL', '')
    expect(() => createPool('development')).toThrow(/DATABASE_URL is not set/)
  })
})
