import 'dotenv/config'
import { closePool, createPool, type DatabaseTarget } from './index'

// A tiny script to answer one question: "can I actually connect to the
// database?" Run with no argument for the dev database, or "test" for
// the test database. Never prints the connection string or password —
// only the database name Postgres itself reports back, which is not a
// secret.

const target: DatabaseTarget = process.argv[2] === 'test' ? 'test' : 'development'

async function main(): Promise<void> {
  const pool = createPool(target)
  try {
    const { rows } = await pool.query<{ database: string; server_time: string }>(
      'SELECT current_database() AS database, now() AS server_time'
    )
    console.log(
      `OK: connected to the "${target}" database ("${rows[0].database}"), server time ${rows[0].server_time}`
    )
  } finally {
    await closePool(pool)
  }
}

main().catch((err) => {
  console.error(`FAILED: could not connect to the "${target}" database — ${err.message}`)
  process.exitCode = 1
})
