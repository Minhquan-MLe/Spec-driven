import 'dotenv/config'
import { Client } from 'pg'
import { getConnectionString } from './index'

// Same fixed data src/store.ts currently seeds in memory — kept here so
// a fresh database starts with the same therapies and future slots the
// app has always shipped with.

interface SeedTherapy {
  name: string
  description: string
  categories: string[]
}

const THERAPIES: SeedTherapy[] = [
  {
    name: 'Timeout Tuning Session',
    description:
      'Diagnose and adjust retry/backoff settings for slow-running tasks.',
    categories: ['performance'],
  },
  {
    name: 'Failover Rehearsal',
    description: 'Practice graceful degradation and failover paths.',
    categories: ['reliability'],
  },
  {
    name: 'API Contract Alignment',
    description:
      'Resolve mismatched request/response shapes between services.',
    categories: ['integration'],
  },
  {
    name: 'Credential Refresh Clinic',
    description: 'Fix expired tokens and misconfigured auth scopes.',
    categories: ['auth'],
  },
  {
    name: 'General Checkup',
    description:
      "A catch-all consultation for anything that doesn't fit elsewhere.",
    categories: ['other'],
  },
]

const SLOT_COUNT = 8

function futureSlotTimestamps(count: number): Date[] {
  // Anchored to the start of today (UTC midnight), not the exact
  // current instant, so re-running this script later the same day
  // produces the exact same timestamps — the ON CONFLICT below then
  // skips them instead of creating duplicate slots. Running it again on
  // a *different* day adds a fresh batch of future slots on top of
  // whatever's already there (existing slots are never removed).
  const startOfToday = new Date()
  startOfToday.setUTCHours(0, 0, 0, 0)
  const day = 24 * 60 * 60 * 1000

  const slots: Date[] = []
  for (let i = 1; i <= count; i++) {
    slots.push(new Date(startOfToday.getTime() + i * day))
  }
  return slots
}

async function main(): Promise<void> {
  const client = new Client({ connectionString: getConnectionString('development') })
  await client.connect()

  try {
    for (const therapy of THERAPIES) {
      await client.query(
        `INSERT INTO therapies (name, description, categories)
         VALUES ($1, $2, $3::text[])
         ON CONFLICT (name) DO NOTHING`,
        [therapy.name, therapy.description, therapy.categories]
      )
    }
    console.log(
      `seeded ${THERAPIES.length} therapies (existing ones with the same name were left untouched)`
    )

    const slots = futureSlotTimestamps(SLOT_COUNT)
    for (const timeSlot of slots) {
      await client.query(
        `INSERT INTO slots (time_slot, taken)
         VALUES ($1, false)
         ON CONFLICT (time_slot) DO NOTHING`,
        [timeSlot.toISOString()]
      )
    }
    console.log(
      `seeded ${slots.length} slots (existing ones with the same time were left untouched)`
    )
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
