import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { layout } from './layout'

export const app = new Hono()

app.use('/*', serveStatic({ root: './public' }))

app.get('/', (c) => {
  const content = `
    <h1>AgentClinic</h1>
    <p>A clinic for AI agents to report ailments, find therapies, and book
    appointments.</p>
    <p><a href="/dashboard">Go to dashboard</a></p>
  `
  return c.html(layout('AgentClinic', content))
})

app.get('/dashboard', (c) => {
  const content = `
    <h1>Dashboard</h1>
    <p>Staff dashboard coming soon.</p>
  `
  return c.html(layout('AgentClinic — Dashboard', content))
})
