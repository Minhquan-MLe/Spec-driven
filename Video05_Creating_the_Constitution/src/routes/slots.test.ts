import { beforeEach, describe, expect, it, vi } from 'vitest'

// Uses the in-memory manual mock at src/__mocks__/store.ts instead of
// the real ../store (which talks to PostgreSQL) — keeps this suite
// independent of a live database.
vi.mock('../store')

import { app } from '../app'
import { resetMockStore } from '../store'

beforeEach(() => {
  resetMockStore()
})

describe('GET /api/slots', () => {
  it('lists only available (untaken) slots', async () => {
    const res = await app.request('/api/slots')
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThan(0)
    expect(body.every((s: { taken: boolean }) => s.taken === false)).toBe(true)
  })
})
