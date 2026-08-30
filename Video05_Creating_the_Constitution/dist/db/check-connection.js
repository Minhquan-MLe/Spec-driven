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
require("dotenv/config");
const index_1 = require("./index");
// A tiny script to answer one question: "can I actually connect to the
// database?" Run with no argument for the dev database, or "test" for
// the test database. Never prints the connection string or password —
// only the database name Postgres itself reports back, which is not a
// secret.
const target = process.argv[2] === 'test' ? 'test' : 'development';
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const pool = (0, index_1.createPool)(target);
        try {
            const { rows } = yield pool.query('SELECT current_database() AS database, now() AS server_time');
            console.log(`OK: connected to the "${target}" database ("${rows[0].database}"), server time ${rows[0].server_time}`);
        }
        finally {
            yield (0, index_1.closePool)(pool);
        }
    });
}
main().catch((err) => {
    console.error(`FAILED: could not connect to the "${target}" database — ${err.message}`);
    process.exitCode = 1;
});
