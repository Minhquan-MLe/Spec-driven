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
// test so none can observe data or cached responses left by another.
beforeEach(() => {
  resetMockStore()
  resetIdempotencyCache()
})

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

async function createTestAilment(overrides: Partial<Record<string, unknown>> = {}) {
  const res = await app.request('/api/ailments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: 'agent-patch',
      category: 'performance',
      title: 'Original title',
      description: 'Original description.',
      ...overrides,
    }),
  })
  return res.json()
}

describe('PATCH /api/ailments/:id', () => {
  it('applies a successful partial update (single field) and returns the updated ailment', async () => {
    const created = await createTestAilment()

    const res = await app.request(`/api/ailments/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ ...created, status: 'resolved' })
  })

  it('applies a successful multi-field update, leaving omitted fields unchanged', async () => {
    const created = await createTestAilment()

    const res = await app.request(`/api/ailments/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New title', status: 'resolved' }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({
      ...created,
      title: 'New title',
      status: 'resolved',
      // description/agentId/category omitted from the request — unchanged
      description: created.description,
      agentId: created.agentId,
      category: created.category,
    })
  })

  it('rejects malformed JSON with a distinct 400 error', async () => {
    const created = await createTestAilment()

    const res = await app.request(`/api/ailments/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: '{not valid json',
    })

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/valid json/i)
  })

  it('rejects an empty body with 400', async () => {
    const created = await createTestAilment()

    const res = await app.request(`/api/ailments/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(400)
    expect((await res.json()).error).toBeTruthy()
  })

  it('rejects a body with only unsupported fields with 400', async () => {
    const created = await createTestAilment()

    const res = await app.request(`/api/ailments/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notARealField: 'x' }),
    })

    expect(res.status).toBe(400)
  })

  it('rejects an invalid category with 400', async () => {
    const created = await createTestAilment()

    const res = await app.request(`/api/ailments/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'not-a-real-category' }),
    })

    expect(res.status).toBe(400)
  })

  it('rejects an invalid status with 400', async () => {
    const created = await createTestAilment()

    const res = await app.request(`/api/ailments/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'not-a-real-status' }),
    })

    expect(res.status).toBe(400)
  })

  it('rejects an empty-string field with 400', async () => {
    const created = await createTestAilment()

    const res = await app.request(`/api/ailments/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '   ' }),
    })

    expect(res.status).toBe(400)
  })

  it('returns 404 for an unknown ailment id', async () => {
    const res = await app.request('/api/ailments/999999', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' }),
    })

    expect(res.status).toBe(404)
  })

  it('returns 404 for a non-numeric ailment id', async () => {
    const res = await app.request('/api/ailments/not-a-number', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' }),
    })

    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/ailments/:id', () => {
  it('deletes an ailment and returns 204 with no body', async () => {
    const created = await createTestAilment()

    const res = await app.request(`/api/ailments/${created.id}`, { method: 'DELETE' })

    expect(res.status).toBe(204)
    expect(await res.text()).toBe('')

    const getRes = await app.request(`/api/ailments/${created.id}`)
    expect(getRes.status).toBe(404)
  })

  it('returns 404 for an unknown ailment id', async () => {
    const res = await app.request('/api/ailments/999999', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })

  it('returns 404 for a non-numeric ailment id', async () => {
    const res = await app.request('/api/ailments/not-a-number', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })
})

// Proves resetIdempotencyCache() (called in this file's top-level
// beforeEach) actually isolates the Idempotency-Key cache between
// tests — reusing the exact same key across two separate `it()` blocks
// must not replay the first test's cached response into the second.
describe('idempotency cache isolation between tests', () => {
  it('creates "Ailment A" using a fixed idempotency key', async () => {
    const res = await app.request('/api/ailments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'shared-key' },
      body: JSON.stringify({
        agentId: 'agent-iso-a',
        category: 'other',
        title: 'Ailment A',
        description: 'd',
      }),
    })
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.title).toBe('Ailment A')
  })

  it('reuses the exact same idempotency key in a later test and still creates a fresh ailment', async () => {
    const res = await app.request('/api/ailments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'shared-key' },
      body: JSON.stringify({
        agentId: 'agent-iso-b',
        category: 'other',
        title: 'Ailment B',
        description: 'd',
      }),
    })
    const body = await res.json()

    // If the cache had leaked from the previous test, this would come
    // back as the previous test's cached "Ailment A" response instead.
    expect(res.status).toBe(201)
    expect(body.title).toBe('Ailment B')
    expect(body.id).toBe(1)
  })
})
