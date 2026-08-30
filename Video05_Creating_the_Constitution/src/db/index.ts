import 'dotenv/config'
import { Pool, type PoolClient, type PoolConfig } from 'pg'

// Shared database configuration and connection pooling.
//
// Used today by the migration/seed/test-db scripts (each sources its
// connection string from here instead of reading process.env
// directly); a later phase will use `getPool()` to wire src/store.ts to
// Postgres. Nothing here logs a connection string or password — error
// messages only ever mention the environment variable *name*.

export type DatabaseTarget = 'development' | 'test'

const ENV_VAR_BY_TARGET: Record<DatabaseTarget, string> = {
  development: 'DATABASE_URL',
  test: 'TEST_DATABASE_URL',
}

/**
 * Reads the connection string for the given target from its env var
 * (`DATABASE_URL` for development, `TEST_DATABASE_URL` for test).
 * Throws a clear, actionable error — never a raw driver crash — if it's
 * missing. Never includes the value of any env var in its own output.
 */
export function getConnectionString(target: DatabaseTarget = 'development'): string {
  const envVar = ENV_VAR_BY_TARGET[target]
  const connectionString = process.env[envVar]
  if (!connectionString) {
    throw new Error(
      `${envVar} is not set. Copy .env.example to .env and fill in real values, then re-run this command.`
    )
  }
  return connectionString
}

/** Creates a new connection pool for the given target. */
export function createPool(target: DatabaseTarget = 'development', config: PoolConfig = {}): Pool {
  return new Pool({ connectionString: getConnectionString(target), ...config })
}

let sharedPool: Pool | undefined

/**
 * The application's shared connection pool (always the development
 * database — nothing in the running app ever talks to the test
 * database). Created on first use, not on import, so importing this
 * module never fails just because `DATABASE_URL` isn't set yet.
 */
export function getPool(): Pool {
  if (!sharedPool) {
    sharedPool = createPool('development')
  }
  return sharedPool
}

/**
 * Closes a pool's connections. Call this at the end of any short-lived
 * script (or in test teardown) so the Node process exits cleanly
 * instead of hanging on an open socket.
 */
export async function closePool(pool: Pool): Promise<void> {
  await pool.end()
}

/**
 * Runs `fn` inside a BEGIN/COMMIT transaction on a single checked-out
 * client, rolling back on any error thrown inside `fn`. Not called by
 * anything yet — added now, alongside the pool it operates on, because
 * appointment create/update/delete (a later phase) needs exactly this.
 */
export async function withTransaction<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    try {
      const result = await fn(client)
      await client.query('COMMIT')
      return result
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    }
  } finally {
    client.release()
  }
}
