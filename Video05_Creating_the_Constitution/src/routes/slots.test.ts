import { describe, expect, it } from 'vitest'
import { app } from '../app'

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
