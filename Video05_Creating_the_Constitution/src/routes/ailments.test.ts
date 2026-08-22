import { describe, expect, it } from 'vitest'
import { app } from '../app'

describe('POST /api/ailments', () => {
  it('creates an ailment and returns 201', async () => {
    const res = await app.request('/api/ailments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'agent-42',
        category: 'performance',
        title: 'Job took too long',
        description: 'A background job exceeded its timeout budget.',
      }),
    })
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body).toMatchObject({
      agentId: 'agent-42',
      category: 'performance',
      title: 'Job took too long',
      status: 'open',
    })
    expect(typeof body.id).toBe('number')
  })

  it('rejects a missing field with 400', async () => {
    const res = await app.request('/api/ailments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: 'agent-42', category: 'performance' }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBeTruthy()
  })

  it('rejects an unknown category with 400', async () => {
    const res = await app.request('/api/ailments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'agent-42',
        category: 'not-a-real-category',
        title: 'Title',
        description: 'Description',
      }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBeTruthy()
  })

  it('rejects a non-string field with 400', async () => {
    const res = await app.request('/api/ailments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'agent-42',
        category: 'performance',
        title: 12345,
        description: 'Description',
      }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBeTruthy()
  })

  it('rejects malformed JSON with a distinct 400 error', async () => {
    const res = await app.request('/api/ailments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not valid json',
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/valid json/i)
  })

  it('replays the original result for a repeated Idempotency-Key', async () => {
    const payload = {
      agentId: 'agent-idempotent',
      category: 'other',
      title: 'Retried ailment',
      description: 'Should only be created once.',
    }

    const first = await app.request('/api/ailments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'ailment-retry-1',
      },
      body: JSON.stringify(payload),
    })
    const firstBody = await first.json()

    const second = await app.request('/api/ailments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'ailment-retry-1',
      },
      body: JSON.stringify(payload),
    })
    const secondBody = await second.json()

    expect(secondBody.id).toBe(firstBody.id)

    const list = await (await app.request('/api/ailments')).json()
    const matches = list.filter(
      (a: { agentId: string }) => a.agentId === 'agent-idempotent'
    )
    expect(matches.length).toBe(1)
  })
})

describe('GET /api/ailments', () => {
  it('lists reported ailments', async () => {
    await app.request('/api/ailments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'agent-list',
        category: 'other',
        title: 'Listable ailment',
        description: 'Should show up in the list.',
      }),
    })

    const res = await app.request('/api/ailments')
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(body)).toBe(true)
    expect(body.some((a: { agentId: string }) => a.agentId === 'agent-list')).toBe(
      true
    )
  })
})

describe('GET /api/ailments/:id', () => {
  it('fetches a single ailment', async () => {
    const created = await (
      await app.request('/api/ailments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'agent-get',
          category: 'integration',
          title: 'Mismatched schema',
          description: 'Two services disagree on the payload shape.',
        }),
      })
    ).json()

    const res = await app.request(`/api/ailments/${created.id}`)
    expect(res.status).toBe(200)
    expect((await res.json()).id).toBe(created.id)
  })

  it('returns 404 for an unknown id', async () => {
    const res = await app.request('/api/ailments/999999')
    expect(res.status).toBe(404)
  })
})

describe('GET /api/ailments/:id/therapies', () => {
  it('returns therapies matching the ailment category', async () => {
    const created = await (
      await app.request('/api/ailments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'agent-therapies',
          category: 'auth',
          title: 'Expired token',
          description: 'Auth token expired mid-request.',
        }),
      })
    ).json()

    const res = await app.request(`/api/ailments/${created.id}/therapies`)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.length).toBeGreaterThan(0)
    expect(
      body.every((t: { categories: string[] }) => t.categories.includes('auth'))
    ).toBe(true)
  })

  it('returns 404 for an unknown ailment id', async () => {
    const res = await app.request('/api/ailments/999999/therapies')
    expect(res.status).toBe(404)
  })
})
