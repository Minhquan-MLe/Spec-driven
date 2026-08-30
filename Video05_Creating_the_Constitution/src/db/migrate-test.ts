import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

// Runs the exact same migration logic as `npm run db:migrate`, but
// against TEST_DATABASE_URL instead of DATABASE_URL. migrate.ts itself
// is unmodified and only ever reads DATABASE_URL — this script just
// overrides that env var for a child process, so dev and test
// migrations can never accidentally point at the wrong database.

const testConnectionString = process.env.TEST_DATABASE_URL
if (!testConnectionString) {
  console.error(
    'TEST_DATABASE_URL is not set. Copy .env.example to .env and fill in real values, then re-run this command.'
  )
  process.exit(1)
}

const result = spawnSync(process.execPath, [join(__dirname, 'migrate.js')], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: testConnectionString },
})

process.exit(result.status ?? 1)
