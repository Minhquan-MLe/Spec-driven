import type { Pool } from 'pg'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { closePool } from '../index'
import { getSlot, listAvailableSlots, setSlotTaken } from './slots'
import { getTherapy, listTherapies } from './therapies'
import { createTestPool, resetTestTables, seedTestFixtures, type TestFixtures } from './testSupport'

// This whole file only ever touches TEST_DATABASE_URL — createTestPool
// always builds its pool from that variable (see testSupport.ts), and
// resetTestTables/seedTestFixtures each independently refuse to run
// against anything but the exact database TEST_DATABASE_URL names.

describe('therapies and slots repository', () => {
  const pool: Pool = createTestPool()
  let fixtures: TestFixtures

  beforeEach(async () => {
    await resetTestTables(pool)
    fixtures = await seedTestFixtures(pool)
  })

  afterAll(async () => {
    await closePool(pool)
  })

  it('lists therapies in ascending id order with camelCase fields', async () => {
    const therapies = await listTherapies(pool)

    expect(therapies).toHaveLength(5)
    expect(therapies.map((t) => t.id)).toEqual([...therapies.map((t) => t.id)].sort((a, b) => a - b))
    for (const therapy of therapies) {
      expect(therapy).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          description: expect.any(String),
          categories: expect.any(Array),
        })
      )
    }
  })

  it('gets a therapy by id', async () => {
    const id = fixtures.therapyIdByCategory.auth
    const therapy = await getTherapy(pool, id)

    expect(therapy).toBeDefined()
    expect(therapy!.categories).toContain('auth')
  })

  it('returns undefined for a missing therapy id', async () => {
    const therapy = await getTherapy(pool, 999_999)
    expect(therapy).toBeUndefined()
  })

  it('lists only available (not taken) slots, ordered by time', async () => {
    const [firstSlotId] = fixtures.slotIds
    await setSlotTaken(pool, firstSlotId, true)

    const available = await listAvailableSlots(pool)

    expect(available.some((s) => s.id === firstSlotId)).toBe(false)
    expect(available).toHaveLength(fixtures.slotIds.length - 1)
    const times = available.map((s) => new Date(s.timeSlot).getTime())
    expect(times).toEqual([...times].sort((a, b) => a - b))
  })

  it('returns ISO string timestamps for slots', async () => {
    const slot = await getSlot(pool, fixtures.slotIds[0])
    expect(slot).toBeDefined()
    expect(typeof slot!.timeSlot).toBe('string')
    expect(new Date(slot!.timeSlot).toISOString()).toBe(slot!.timeSlot)
  })

  it('returns undefined for a missing slot id', async () => {
    const slot = await getSlot(pool, 999_999)
    expect(slot).toBeUndefined()
  })
})
