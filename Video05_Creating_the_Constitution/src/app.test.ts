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

  it('renders ailments, therapies, and appointments sourced from the store', async () => {
    await app.request('/api/ailments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'agent-dashboard',
        category: 'reliability',
        title: 'Dashboard-visible ailment',
        description: 'Should show up in the dashboard ailments table.',
      }),
    })
    const slotId = (await (await app.request('/api/slots')).json())[0].id
    await app.request('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'agent-dashboard',
        therapyId: 1,
        slotId,
      }),
    })

    const body = await (await app.request('/dashboard')).text()

    expect(body).toContain('Dashboard-visible ailment')
    expect(body).toContain('Timeout Tuning Session')
    expect(body).toContain('agent-dashboard')
  })

  it('escapes ailment fields so they cannot break out of the table markup', async () => {
    await app.request('/api/ailments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'agent-xss',
        category: 'other',
        title: '</td></tr><script>alert(1)</script>',
        description: 'Attempted injection.',
      }),
    })

    const body = await (await app.request('/dashboard')).text()

    expect(body).not.toContain('<script>alert(1)</script>')
    expect(body).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })
})

describe('/styles.css', () => {
  it('is served as a static asset', async () => {
    const res = await app.request('/styles.css')
    expect(res.status).toBe(200)
  })
})
