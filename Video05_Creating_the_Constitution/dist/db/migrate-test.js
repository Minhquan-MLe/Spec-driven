"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const node_child_process_1 = require("node:child_process");
const node_path_1 = require("node:path");
const index_1 = require("./index");
// Runs the exact same migration logic as `npm run db:migrate`, but
// against TEST_DATABASE_URL instead of DATABASE_URL. migrate.ts itself
// is unmodified and only ever reads DATABASE_URL — this script just
// overrides that env var for a child process, so dev and test
// migrations can never accidentally point at the wrong database.
let testConnectionString;
try {
    testConnectionString = (0, index_1.getConnectionString)('test');
}
catch (err) {
    console.error(err.message);
    process.exit(1);
}
const result = (0, node_child_process_1.spawnSync)(process.execPath, [(0, node_path_1.join)(__dirname, 'migrate.js')], {
    stdio: 'inherit',
    env: Object.assign(Object.assign({}, process.env), { DATABASE_URL: testConnectionString }),
});
process.exit((_a = result.status) !== null && _a !== void 0 ? _a : 1);
