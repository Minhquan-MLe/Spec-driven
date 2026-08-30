import type { Pool, PoolClient } from 'pg'

// Every repository function accepts either a Pool (for a plain,
// one-off query) or a PoolClient (when it needs to run as part of a
// transaction started by withTransaction in ../index.ts) — both expose
// a compatible `.query()` method, so callers don't need two versions of
// each function.
export type QueryExecutor = Pool | PoolClient
