import 'dotenv/config'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { Client } from 'pg'

// Run from the project root (that's how the db:migrate npm script
// invokes it), so migrations live at src/db/migrations relative to cwd.
const MIGRATIONS_DIR = join(process.cwd(), 'src', 'db', 'migrations')

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env and fill in real values, then re-run this command.'
    )
  }

  const client = new Client({ connectionString })
  await client.connect()

  try {
    // Tracks which migration files have already been applied, so
    // running this script again only applies new ones.
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)

    const alreadyApplied = new Set(
      (await client.query<{ filename: string }>('SELECT filename FROM schema_migrations')).rows.map(
        (row) => row.filename
      )
    )

    const migrationFiles = readdirSync(MIGRATIONS_DIR)
      .filter((filename) => filename.endsWith('.sql'))
      .sort()

    for (const filename of migrationFiles) {
      if (alreadyApplied.has(filename)) {
        console.log(`skip (already applied): ${filename}`)
        continue
      }

      const sql = readFileSync(join(MIGRATIONS_DIR, filename), 'utf8')
      console.log(`applying: ${filename}`)

      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename])
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      }
    }

    console.log('migrations up to date')
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
