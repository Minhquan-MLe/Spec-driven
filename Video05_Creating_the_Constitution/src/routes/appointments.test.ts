import { describe, expect, it } from 'vitest'
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

  it('rejects an unknown therapyId with 400', async () => {
    const slotId = await firstAvailableSlotId()
    const res = await app.request('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'agent-1', therapyId: 999_999, slotId }),
    })
    expect(res.status).toBe(400)
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
