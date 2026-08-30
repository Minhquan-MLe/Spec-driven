import 'dotenv/config'
import { Client } from 'pg'
import { getConnectionString } from './index'

// Creates the agentclinic_test database on the SAME Postgres server/
// container as the dev database (DATABASE_URL), if it doesn't already
// exist. Never touches the dev database's data — it only reads/writes
// the server's pg_database catalog.
//
// Safe to run more than once: Postgres has no "CREATE DATABASE IF NOT
// EXISTS", so this checks pg_database first and skips the CREATE if the
// database is already there.

const VALID_DB_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*$/

function testDatabaseName(url: string): string {
  const name = new URL(url).pathname.replace(/^\//, '')
  if (!VALID_DB_NAME.test(name)) {
    throw new Error(
      `TEST_DATABASE_URL's database name ("${name}") must be a plain identifier (letters, digits, underscore).`
    )
  }
  return name
}

async function main(): Promise<void> {
  const adminConnectionString = getConnectionString('development')
  const testConnectionString = getConnectionString('test')

  const testDbName = testDatabaseName(testConnectionString)

  // Connecting via DATABASE_URL (the dev database) is enough — you
  // don't need to already be connected to the database you're about to
  // create, just to any database on the same Postgres server/user with
  // permission to create one.
  const client = new Client({ connectionString: adminConnectionString })
  await client.connect()

  try {
    const { rows } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      testDbName,
    ])
    if (rows.length > 0) {
      console.log(`database "${testDbName}" already exists — nothing to do`)
      return
    }

    // CREATE DATABASE cannot run inside a transaction block, hence the
    // plain query here rather than the BEGIN/COMMIT pattern migrate.ts
    // uses for schema changes.
    await client.query(`CREATE DATABASE "${testDbName}"`)
    console.log(`created database "${testDbName}"`)
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
