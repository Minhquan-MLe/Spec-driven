import { describe, expect, it } from 'vitest'
import { app } from './app'

describe('/', () => {
  it('renders the AgentClinic home page with a link to /dashboard', async () => {
    const res = await app.request('/')
    const body = await res.text()

    expect(res.status).toBe(200)
    expect(body).toContain('<h1>AgentClinic</h1>')
    expect(body).toContain('href="/dashboard"')
    expect(body).toContain('<header class="site-header">')
    expect(body).toContain('<footer class="site-footer">')
  })
})

describe('/dashboard', () => {
  it('renders the shared layout with placeholder dashboard content', async () => {
    const res = await app.request('/dashboard')
    const body = await res.text()

    expect(res.status).toBe(200)
    expect(body).toContain('<h1>Dashboard</h1>')
    expect(body).toContain('<header class="site-header">')
    expect(body).toContain('<footer class="site-footer">')
  })
})

describe('/styles.css', () => {
  it('is served as a static asset', async () => {
    const res = await app.request('/styles.css')
    expect(res.status).toBe(200)
  })
})
