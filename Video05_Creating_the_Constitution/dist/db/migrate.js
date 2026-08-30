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
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const pg_1 = require("pg");
const index_1 = require("./index");
// Run from the project root (that's how the db:migrate npm script
// invokes it), so migrations live at src/db/migrations relative to cwd.
const MIGRATIONS_DIR = (0, node_path_1.join)(process.cwd(), 'src', 'db', 'migrations');
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // A single Client (not the shared Pool) is the right tool here — this
        // script runs its statements sequentially on one connection and never
        // needs concurrent queries. Only the connection string itself comes
        // from the shared module, so dev/test targeting stays centralized.
        const client = new pg_1.Client({ connectionString: (0, index_1.getConnectionString)('development') });
        yield client.connect();
        try {
            // Tracks which migration files have already been applied, so
            // running this script again only applies new ones.
            yield client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
            const alreadyApplied = new Set((yield client.query('SELECT filename FROM schema_migrations')).rows.map((row) => row.filename));
            const migrationFiles = (0, node_fs_1.readdirSync)(MIGRATIONS_DIR)
                .filter((filename) => filename.endsWith('.sql'))
                .sort();
            for (const filename of migrationFiles) {
                if (alreadyApplied.has(filename)) {
                    console.log(`skip (already applied): ${filename}`);
                    continue;
                }
                const sql = (0, node_fs_1.readFileSync)((0, node_path_1.join)(MIGRATIONS_DIR, filename), 'utf8');
                console.log(`applying: ${filename}`);
                yield client.query('BEGIN');
                try {
                    yield client.query(sql);
                    yield client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
                    yield client.query('COMMIT');
                }
                catch (err) {
                    yield client.query('ROLLBACK');
                    throw err;
                }
            }
            console.log('migrations up to date');
        }
        finally {
            yield client.end();
        }
    });
}
main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
