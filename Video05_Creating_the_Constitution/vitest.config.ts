import { configDefaults, defineConfig } from 'vitest/config'

// The default `vitest run` (npm test) config. It must never load the
// database integration tests (*.integration.test.ts) — those need a
// running Postgres test database and are run separately via
// `npm run test:db` / vitest.db.config.ts. Excluding them here is what
// makes `npm test` safe to run with no database at all.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, '**/*.integration.test.ts'],
  },
})
