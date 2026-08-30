import { describe, expect, it, vi } from 'vitest'

// Uses the in-memory manual mock at src/__mocks__/store.ts instead of
// the real ../store (which talks to PostgreSQL) — keeps this suite
// independent of a live database.
vi.mock('../store')

import { app } from '../app'

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
