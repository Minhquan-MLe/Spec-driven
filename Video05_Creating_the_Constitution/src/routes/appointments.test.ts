import { beforeEach, describe, expect, it, vi } from 'vitest'

// Uses the in-memory manual mock at src/__mocks__/store.ts instead of
// the real ../store (which talks to PostgreSQL) — keeps this suite
// independent of a live database.
vi.mock('../store')

import { app } from '../app'
import { resetIdempotencyCache } from '../idempotency'
import { resetMockStore } from '../store'

// The mock module (and the real idempotency cache, which isn't mocked)
// are shared across every test in this file — reset both before each
// test so none can observe data, booked slots, or cached responses
// left by another.
beforeEach(() => {
  resetMockStore()
  resetIdempotencyCache()
})

async function firstAvailableSlotId(): Promise<number> {
  const slots = await (await app.request('/api/slots')).json()
  return slots[0].id
}

describe('POST /api/appointments', () => {
  it('books an appointment against an available slot', async () => {
    const slotId = await firstAvailableSlotId()

    const res = await app.request('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'agent-1', therapyId: 1, slotId }),
    })
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body).toMatchObject({ agentId: 'agent-1', therapyId: 1, slotId })
  })

  it('rejects a missing field with 400', async () => {
    const res = await app.request('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'agent-1', therapyId: 1 }),
    })
    expect(res.status).toBe(400)
  })

  it('rejects an unknown therapyId with 404', async () => {
    const slotId = await firstAvailableSlotId()
    const res = await app.request('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'agent-1', therapyId: 999_999, slotId }),
    })
    expect(res.status).toBe(404)
  })

  it('rejects a non-numeric therapyId with 400', async () => {
    const slotId = await firstAvailableSlotId()
    const res = await app.request('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'agent-1', therapyId: 'not-a-number', slotId }),
    })
    expect(res.status).toBe(400)
  })

  it('rejects malformed JSON with a distinct 400 error', async () => {
    const res = await app.request('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not valid json',
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/valid json/i)
  })

  it('replays the original result for a repeated Idempotency-Key', async () => {
    const slotId = await firstAvailableSlotId()
    const payload = {
      agentId: 'agent-retry',
      therapyId: 1,
      slotId,
    }

    const first = await app.request('/api/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'retry-key-1',
      },
      body: JSON.stringify(payload),
    })
    const firstBody = await first.json()
    expect(first.status).toBe(201)

    const second = await app.request('/api/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'retry-key-1',
      },
      body: JSON.stringify(payload),
    })
    const secondBody = await second.json()

    expect(second.status).toBe(201)
    expect(secondBody).toEqual(firstBody)
  })

  it('rejects booking an already-taken slot with 409', async () => {
    const slotId = await firstAvailableSlotId()

    const first = await app.request('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'agent-1', therapyId: 1, slotId }),
    })
    expect(first.status).toBe(201)

    const second = await app.request('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'agent-2', therapyId: 1, slotId }),
    })
    expect(second.status).toBe(409)
  })
})

describe('GET /api/appointments', () => {
  it('lists booked appointments', async () => {
    const slotId = await firstAvailableSlotId()
    await app.request('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'agent-listing', therapyId: 1, slotId }),
    })

    const res = await app.request('/api/appointments')
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(
      body.some((a: { agentId: string }) => a.agentId === 'agent-listing')
    ).toBe(true)
  })
})

async function bookTestAppointment(overrides: { agentId?: string; therapyId?: number; slotId?: number } = {}) {
  const slotId = overrides.slotId ?? (await firstAvailableSlotId())
  const res = await app.request('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: overrides.agentId ?? 'agent-crud',
      therapyId: overrides.therapyId ?? 1,
      slotId,
    }),
  })
  return res.json()
}

describe('GET /api/appointments/:id', () => {
  it('fetches a single appointment', async () => {
    const created = await bookTestAppointment()

    const res = await app.request(`/api/appointments/${created.id}`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(created)
  })

  it('returns 404 for an unknown id', async () => {
    const res = await app.request('/api/appointments/999999')
    expect(res.status).toBe(404)
  })

  it('returns 404 for a non-numeric id', async () => {
    const res = await app.request('/api/appointments/not-a-number')
    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/appointments/:id', () => {
  it('updates agentId only, leaving the slot untouched', async () => {
    const created = await bookTestAppointment()

    const res = await app.request(`/api/appointments/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'agent-renamed' }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ ...created, agentId: 'agent-renamed' })

    const slots = await (await app.request('/api/slots')).json()
    expect(slots.some((s: { id: number }) => s.id === created.slotId)).toBe(false)
  })

  it('moves the appointment to a different available slot: old slot freed, new slot reserved', async () => {
    const slotsBefore = await (await app.request('/api/slots')).json()
    const created = await bookTestAppointment({ slotId: slotsBefore[0].id })
    const newSlotId = slotsBefore[1].id

    const res = await app.request(`/api/appointments/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId: newSlotId }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ ...created, slotId: newSlotId })

    const slotsAfter = await (await app.request('/api/slots')).json()
    expect(slotsAfter.some((s: { id: number }) => s.id === created.slotId)).toBe(true)
    expect(slotsAfter.some((s: { id: number }) => s.id === newSlotId)).toBe(false)
  })

  it('correctly handles an update that keeps the same slot (no-op for slot state)', async () => {
    const created = await bookTestAppointment()

    const res = await app.request(`/api/appointments/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'agent-same-slot', slotId: created.slotId }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ ...created, agentId: 'agent-same-slot' })

    const slots = await (await app.request('/api/slots')).json()
    expect(slots.some((s: { id: number }) => s.id === created.slotId)).toBe(false)
  })

  it('rejects moving to a slot that is already taken with 409, leaving both appointments unchanged', async () => {
    const slotsBefore = await (await app.request('/api/slots')).json()
    const first = await bookTestAppointment({ agentId: 'agent-first', slotId: slotsBefore[0].id })
    const second = await bookTestAppointment({ agentId: 'agent-second', slotId: slotsBefore[1].id })

    const res = await app.request(`/api/appointments/${first.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId: second.slotId }),
    })

    expect(res.status).toBe(409)

    const unchanged = await (await app.request(`/api/appointments/${first.id}`)).json()
    expect(unchanged.slotId).toBe(first.slotId)
  })

  it('returns 404 when moving to an unknown slot', async () => {
    const created = await bookTestAppointment()

    const res = await app.request(`/api/appointments/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId: 999_999 }),
    })

    expect(res.status).toBe(404)
  })

  it('returns 404 for an unknown therapyId', async () => {
    const created = await bookTestAppointment()

    const res = await app.request(`/api/appointments/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ therapyId: 999_999 }),
    })

    expect(res.status).toBe(404)
  })

  it('returns 404 for an unknown appointment id', async () => {
    const res = await app.request('/api/appointments/999999', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'someone' }),
    })

    expect(res.status).toBe(404)
  })

  it('returns 404 for a non-numeric appointment id', async () => {
    const res = await app.request('/api/appointments/not-a-number', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'someone' }),
    })

    expect(res.status).toBe(404)
  })

  it('rejects malformed JSON with a distinct 400 error', async () => {
    const created = await bookTestAppointment()

    const res = await app.request(`/api/appointments/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: '{not valid json',
    })

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/valid json/i)
  })

  it('rejects an empty body with 400', async () => {
    const created = await bookTestAppointment()

    const res = await app.request(`/api/appointments/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(400)
  })

  it('rejects a non-numeric therapyId with 400', async () => {
    const created = await bookTestAppointment()

    const res = await app.request(`/api/appointments/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ therapyId: 'not-a-number' }),
    })

    expect(res.status).toBe(400)
  })

  it('rejects an empty-string agentId with 400', async () => {
    const created = await bookTestAppointment()

    const res = await app.request(`/api/appointments/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: '   ' }),
    })

    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/appointments/:id', () => {
  it('deletes an appointment, returns 204 with no body, and releases its slot', async () => {
    const created = await bookTestAppointment()

    const res = await app.request(`/api/appointments/${created.id}`, { method: 'DELETE' })

    expect(res.status).toBe(204)
    expect(await res.text()).toBe('')

    const getRes = await app.request(`/api/appointments/${created.id}`)
    expect(getRes.status).toBe(404)

    const slots = await (await app.request('/api/slots')).json()
    expect(slots.some((s: { id: number }) => s.id === created.slotId)).toBe(true)
  })

  it('returns 404 for an unknown appointment id', async () => {
    const res = await app.request('/api/appointments/999999', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })

  it('returns 404 for a non-numeric appointment id', async () => {
    const res = await app.request('/api/appointments/not-a-number', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })
})

// These three tests exist specifically to prove resetMockStore() (called
// in this file's top-level beforeEach) actually isolates tests from each
// other. Their order matters — each one's setup assumes the *previous*
// test's mutations were wiped, which is exactly the guarantee being
// tested.
describe('mock store isolation between tests', () => {
  it('books a slot, mutating shared mock state', async () => {
    const slotsBefore = await (await app.request('/api/slots')).json()
    expect(slotsBefore.length).toBe(8)

    const res = await app.request('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'isolation-agent', therapyId: 1, slotId: slotsBefore[0].id }),
    })
    expect(res.status).toBe(201)

    const slotsAfter = await (await app.request('/api/slots')).json()
    expect(slotsAfter.length).toBe(7)
  })

  it('starts again with exactly 8 available slots and reset id numbering', async () => {
    const slots = await (await app.request('/api/slots')).json()
    expect(slots.length).toBe(8)
    expect(slots.map((s: { id: number }) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])

    expect(await (await app.request('/api/appointments')).json()).toEqual([])

    const created = await (
      await app.request('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'fresh-agent', therapyId: 1, slotId: slots[0].id }),
      })
    ).json()
    // If the previous test's booking had leaked, this would come back
    // as id 2 (or the slot would already be taken).
    expect(created.id).toBe(1)
  })

  it('still releases a slot on delete after a reset', async () => {
    const [slot] = await (await app.request('/api/slots')).json()
    const created = await (
      await app.request('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'agent-release', therapyId: 1, slotId: slot.id }),
      })
    ).json()

    const del = await app.request(`/api/appointments/${created.id}`, { method: 'DELETE' })
    expect(del.status).toBe(204)

    const slotsAfter = await (await app.request('/api/slots')).json()
    expect(slotsAfter.length).toBe(8)
    expect(slotsAfter.some((s: { id: number }) => s.id === slot.id)).toBe(true)
  })
})
