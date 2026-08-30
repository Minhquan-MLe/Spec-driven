import { defineConfig } from 'vitest/config'

// Config for `npm run test:db` only. Loads exactly the repository
// integration tests, which connect to TEST_DATABASE_URL and reset
// tables between tests (see src/db/repository/testSupport.ts) — run
// sequentially so no two test files reset the same tables at once.
export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.ts'],
    fileParallelism: false,
  },
})
