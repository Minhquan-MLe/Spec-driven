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
/** Creates a new connection pool for the given target. */
function createPool(target = 'development', config = {}) {
    return new pg_1.Pool(Object.assign({ connectionString: getConnectionString(target) }, config));
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
