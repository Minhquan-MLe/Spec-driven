import type { Pool } from 'pg'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { closePool, withTransaction } from '../index'
import {
  createAppointment,
  deleteAppointment,
  getAppointment,
  listAppointments,
  updateAppointment,
} from './appointments'
import { getSlot } from './slots'
import { createTestPool, resetTestTables, seedTestFixtures, type TestFixtures } from './testSupport'

describe('appointments repository', () => {
  const pool: Pool = createTestPool()
  let fixtures: TestFixtures

  beforeEach(async () => {
    await resetTestTables(pool)
    fixtures = await seedTestFixtures(pool)
  })

  afterAll(async () => {
    await closePool(pool)
  })

  it('creates an appointment, maps fields to camelCase, and marks the slot taken', async () => {
    const [slotId] = fixtures.slotIds
    const result = await createAppointment(pool, {
      agentId: 'agent-1',
      therapyId: fixtures.therapyIdByCategory.auth,
      slotId,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok result')
    expect(result.appointment).toEqual({
      id: expect.any(Number),
      agentId: 'agent-1',
      therapyId: fixtures.therapyIdByCategory.auth,
      slotId,
      createdAt: expect.any(String),
    })

    const slot = await getSlot(pool, slotId)
    expect(slot!.taken).toBe(true)
  })

  it('rejects an unknown therapy id without touching the slot', async () => {
    const [slotId] = fixtures.slotIds
    const result = await createAppointment(pool, {
      agentId: 'agent-1',
      therapyId: 999_999,
      slotId,
    })

    expect(result).toEqual({ ok: false, reason: 'therapy_not_found' })
    expect((await getSlot(pool, slotId))!.taken).toBe(false)
  })

  it('rejects an unknown slot id', async () => {
    const result = await createAppointment(pool, {
      agentId: 'agent-1',
      therapyId: fixtures.therapyIdByCategory.auth,
      slotId: 999_999,
    })

    expect(result).toEqual({ ok: false, reason: 'slot_not_found' })
  })

  it('rejects booking a slot that is already taken, and creates no second appointment', async () => {
    const [slotId] = fixtures.slotIds
    const first = await createAppointment(pool, {
      agentId: 'agent-1',
      therapyId: fixtures.therapyIdByCategory.auth,
      slotId,
    })
    expect(first.ok).toBe(true)

    const second = await createAppointment(pool, {
      agentId: 'agent-2',
      therapyId: fixtures.therapyIdByCategory.auth,
      slotId,
    })

    expect(second).toEqual({ ok: false, reason: 'slot_taken' })
    expect(await listAppointments(pool)).toHaveLength(1)
  })

  it('lists appointments newest first', async () => {
    const first = await createAppointment(pool, {
      agentId: 'agent-1',
      therapyId: fixtures.therapyIdByCategory.auth,
      slotId: fixtures.slotIds[0],
    })
    const second = await createAppointment(pool, {
      agentId: 'agent-2',
      therapyId: fixtures.therapyIdByCategory.other,
      slotId: fixtures.slotIds[1],
    })
    if (!first.ok || !second.ok) throw new Error('setup failed')

    const listed = await listAppointments(pool)

    expect(listed.map((a) => a.id)).toEqual([second.appointment.id, first.appointment.id])
  })

  it('gets an appointment by id, and undefined for a missing one', async () => {
    const created = await createAppointment(pool, {
      agentId: 'agent-1',
      therapyId: fixtures.therapyIdByCategory.auth,
      slotId: fixtures.slotIds[0],
    })
    if (!created.ok) throw new Error('setup failed')

    await expect(getAppointment(pool, created.appointment.id)).resolves.toEqual(created.appointment)
    await expect(getAppointment(pool, 999_999)).resolves.toBeUndefined()
  })

  it('updates to a different slot: releases the old one and reserves the new one', async () => {
    const created = await createAppointment(pool, {
      agentId: 'agent-1',
      therapyId: fixtures.therapyIdByCategory.auth,
      slotId: fixtures.slotIds[0],
    })
    if (!created.ok) throw new Error('setup failed')

    const result = await updateAppointment(pool, created.appointment.id, {
      slotId: fixtures.slotIds[1],
    })

    expect(result).toEqual({
      ok: true,
      appointment: { ...created.appointment, slotId: fixtures.slotIds[1] },
    })
    expect((await getSlot(pool, fixtures.slotIds[0]))!.taken).toBe(false)
    expect((await getSlot(pool, fixtures.slotIds[1]))!.taken).toBe(true)
  })

  it('rejects updating to a slot that is already taken, leaving both slots unchanged', async () => {
    const first = await createAppointment(pool, {
      agentId: 'agent-1',
      therapyId: fixtures.therapyIdByCategory.auth,
      slotId: fixtures.slotIds[0],
    })
    const second = await createAppointment(pool, {
      agentId: 'agent-2',
      therapyId: fixtures.therapyIdByCategory.auth,
      slotId: fixtures.slotIds[1],
    })
    if (!first.ok || !second.ok) throw new Error('setup failed')

    const result = await updateAppointment(pool, first.appointment.id, {
      slotId: fixtures.slotIds[1],
    })

    expect(result).toEqual({ ok: false, reason: 'slot_taken' })
    expect((await getSlot(pool, fixtures.slotIds[0]))!.taken).toBe(true)
    expect((await getSlot(pool, fixtures.slotIds[1]))!.taken).toBe(true)
    expect((await getAppointment(pool, first.appointment.id))!.slotId).toBe(fixtures.slotIds[0])
  })

  it('correctly handles an update that keeps the same slot (no release/reserve cycle)', async () => {
    const created = await createAppointment(pool, {
      agentId: 'agent-1',
      therapyId: fixtures.therapyIdByCategory.auth,
      slotId: fixtures.slotIds[0],
    })
    if (!created.ok) throw new Error('setup failed')

    const result = await updateAppointment(pool, created.appointment.id, {
      agentId: 'agent-1-renamed',
      slotId: fixtures.slotIds[0],
    })

    expect(result).toEqual({
      ok: true,
      appointment: { ...created.appointment, agentId: 'agent-1-renamed' },
    })
    expect((await getSlot(pool, fixtures.slotIds[0]))!.taken).toBe(true)
  })

  it('rejects updating to an unknown therapy, applying no changes', async () => {
    const created = await createAppointment(pool, {
      agentId: 'agent-1',
      therapyId: fixtures.therapyIdByCategory.auth,
      slotId: fixtures.slotIds[0],
    })
    if (!created.ok) throw new Error('setup failed')

    const result = await updateAppointment(pool, created.appointment.id, { therapyId: 999_999 })

    expect(result).toEqual({ ok: false, reason: 'therapy_not_found' })
    expect(await getAppointment(pool, created.appointment.id)).toEqual(created.appointment)
  })

  it('returns appointment_not_found when updating a missing appointment', async () => {
    const result = await updateAppointment(pool, 999_999, { agentId: 'someone' })
    expect(result).toEqual({ ok: false, reason: 'appointment_not_found' })
  })

  it('deletes an appointment and releases its slot', async () => {
    const created = await createAppointment(pool, {
      agentId: 'agent-1',
      therapyId: fixtures.therapyIdByCategory.auth,
      slotId: fixtures.slotIds[0],
    })
    if (!created.ok) throw new Error('setup failed')

    const result = await deleteAppointment(pool, created.appointment.id)

    expect(result).toEqual({ ok: true, appointment: created.appointment })
    expect((await getSlot(pool, fixtures.slotIds[0]))!.taken).toBe(false)
    await expect(getAppointment(pool, created.appointment.id)).resolves.toBeUndefined()
  })

  it('returns appointment_not_found when deleting a missing appointment', async () => {
    const result = await deleteAppointment(pool, 999_999)
    expect(result).toEqual({ ok: false, reason: 'appointment_not_found' })
  })

  it('rolls back every write made inside a transaction that then throws', async () => {
    // Proves the exact mechanism createAppointment/updateAppointment/
    // deleteAppointment all rely on: a write made inside withTransaction
    // is not visible afterward if the callback throws. Uses a plain
    // ailment insert as the simplest possible probe — not because this
    // test is "about" ailments.
    await expect(
      withTransaction(pool, async (client) => {
        await client.query(
          `INSERT INTO ailments (agent_id, category, title, description) VALUES ($1, $2, $3, $4)`,
          ['agent-rollback', 'other', 'should not survive', 'd']
        )
        throw new Error('forced failure after write')
      })
    ).rejects.toThrow('forced failure after write')

    const { rows } = await pool.query('SELECT count(*) AS count FROM ailments')
    expect(Number(rows[0].count)).toBe(0)
  })
})
