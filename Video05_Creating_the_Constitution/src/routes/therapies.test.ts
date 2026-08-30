import { describe, expect, it, vi } from 'vitest'

// Uses the in-memory manual mock at src/__mocks__/store.ts instead of
// the real ../store (which talks to PostgreSQL) — keeps this suite
// independent of a live database.
vi.mock('../store')

import { app } from '../app'

describe('GET /api/therapies', () => {
  it('lists the seeded therapies', async () => {
    const res = await app.request('/api/therapies')
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
    expect(body[0]).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
      categories: expect.any(Array),
    })
  })
})
