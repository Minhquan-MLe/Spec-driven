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
const pg_1 = require("pg");
const index_1 = require("./index");
const THERAPIES = [
    {
        name: 'Timeout Tuning Session',
        description: 'Diagnose and adjust retry/backoff settings for slow-running tasks.',
        categories: ['performance'],
    },
    {
        name: 'Failover Rehearsal',
        description: 'Practice graceful degradation and failover paths.',
        categories: ['reliability'],
    },
    {
        name: 'API Contract Alignment',
        description: 'Resolve mismatched request/response shapes between services.',
        categories: ['integration'],
    },
    {
        name: 'Credential Refresh Clinic',
        description: 'Fix expired tokens and misconfigured auth scopes.',
        categories: ['auth'],
    },
    {
        name: 'General Checkup',
        description: "A catch-all consultation for anything that doesn't fit elsewhere.",
        categories: ['other'],
    },
];
const SLOT_COUNT = 8;
function futureSlotTimestamps(count) {
    // Anchored to the start of today (UTC midnight), not the exact
    // current instant, so re-running this script later the same day
    // produces the exact same timestamps — the ON CONFLICT below then
    // skips them instead of creating duplicate slots. Running it again on
    // a *different* day adds a fresh batch of future slots on top of
    // whatever's already there (existing slots are never removed).
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const day = 24 * 60 * 60 * 1000;
    const slots = [];
    for (let i = 1; i <= count; i++) {
        slots.push(new Date(startOfToday.getTime() + i * day));
    }
    return slots;
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = new pg_1.Client({ connectionString: (0, index_1.getConnectionString)('development') });
        yield client.connect();
        try {
            for (const therapy of THERAPIES) {
                yield client.query(`INSERT INTO therapies (name, description, categories)
         VALUES ($1, $2, $3::text[])
         ON CONFLICT (name) DO NOTHING`, [therapy.name, therapy.description, therapy.categories]);
            }
            console.log(`seeded ${THERAPIES.length} therapies (existing ones with the same name were left untouched)`);
            const slots = futureSlotTimestamps(SLOT_COUNT);
            for (const timeSlot of slots) {
                yield client.query(`INSERT INTO slots (time_slot, taken)
         VALUES ($1, false)
         ON CONFLICT (time_slot) DO NOTHING`, [timeSlot.toISOString()]);
            }
            console.log(`seeded ${slots.length} slots (existing ones with the same time were left untouched)`);
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
