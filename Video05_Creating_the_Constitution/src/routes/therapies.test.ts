import { describe, expect, it } from 'vitest'
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
