"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnectionString = getConnectionString;
exports.createPool = createPool;
exports.getPool = getPool;
exports.closePool = closePool;
exports.withTransaction = withTransaction;
require("dotenv/config");
const pg_1 = require("pg");
const ENV_VAR_BY_TARGET = {
    development: 'DATABASE_URL',
    test: 'TEST_DATABASE_URL',
};
/**
 * Reads the connection string for the given target from its env var
 * (`DATABASE_URL` for development, `TEST_DATABASE_URL` for test).
 * Throws a clear, actionable error — never a raw driver crash — if it's
 * missing. Never includes the value of any env var in its own output.
 */
function getConnectionString(target = 'development') {
    const envVar = ENV_VAR_BY_TARGET[target];
    const connectionString = process.env[envVar];
    if (!connectionString) {
        throw new Error(`${envVar} is not set. Copy .env.example to .env and fill in real values, then re-run this command.`);
    }
    return connectionString;
}
/**
 * Attaches the pool's one and only `error` listener. `pg.Pool` emits
 * `error` when an *idle* client (not in the middle of a query) is
 * disconnected in the background — e.g. Postgres terminating the
 * connection on `docker compose stop`/`restart`. Node's EventEmitter
 * crashes the process on an `error` event with no listener, so without
 * this, a Postgres restart can kill the whole running app even though
 * no request was in flight.
 *
 * This does NOT affect normal query error handling: a query made while
 * Postgres is unavailable still rejects its own promise and propagates
 * through the usual route → app.onError path to the existing generic
 * 500 response, exactly as before. This only stops a *background*
 * connection loss from crashing the process outright. It also adds no
 * retry logic — `pg.Pool` already opens a fresh connection on the next
 * query once Postgres is reachable again; nothing here needs to drive
 * that.
 *
 * Logs only `err.message` — never the error object itself (which can
 * carry a `client` property with connection details) — so no
 * connection string, password, or SQL ever reaches the log.
 */
function attachPoolErrorHandler(pool) {
    pool.on('error', (err) => {
        console.error(`[db] pool error (idle connection lost): ${err.message}`);
    });
}
/** Creates a new connection pool for the given target. */
function createPool(target = 'development', config = {}) {
    const pool = new pg_1.Pool(Object.assign({ connectionString: getConnectionString(target) }, config));
    attachPoolErrorHandler(pool);
    return pool;
}
let sharedPool;
/**
 * The application's shared connection pool (always the development
 * database — nothing in the running app ever talks to the test
 * database). Created on first use, not on import, so importing this
 * module never fails just because `DATABASE_URL` isn't set yet.
 */
function getPool() {
    if (!sharedPool) {
        sharedPool = createPool('development');
    }
    return sharedPool;
}
/**
 * Closes a pool's connections. Call this at the end of any short-lived
 * script (or in test teardown) so the Node process exits cleanly
 * instead of hanging on an open socket.
 */
function closePool(pool) {
    return __awaiter(this, void 0, void 0, function* () {
        yield pool.end();
    });
}
/**
 * Runs `fn` inside a BEGIN/COMMIT transaction on a single checked-out
 * client, rolling back on any error thrown inside `fn`. Not called by
 * anything yet — added now, alongside the pool it operates on, because
 * appointment create/update/delete (a later phase) needs exactly this.
 */
function withTransaction(pool, fn) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield pool.connect();
        try {
            yield client.query('BEGIN');
            try {
                const result = yield fn(client);
                yield client.query('COMMIT');
                return result;
            }
            catch (err) {
                yield client.query('ROLLBACK');
                throw err;
            }
        }
        finally {
            client.release();
        }
    });
}
