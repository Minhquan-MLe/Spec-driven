import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { escapeHtml } from './html'
import { layout } from './layout'
import { ailments } from './routes/ailments'
import { therapies } from './routes/therapies'
import { slots } from './routes/slots'
import { appointments } from './routes/appointments'
import {
  getSlot,
  getTherapy,
  listAilments,
  listAppointments,
  listTherapies,
} from './store'

export const app = new Hono()

app.use('/*', serveStatic({ root: './public' }))

app.route('/api/ailments', ailments)
app.route('/api/therapies', therapies)
app.route('/api/slots', slots)
app.route('/api/appointments', appointments)

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
  const ailmentRows = listAilments()
    .map(
      (a) =>
        `<tr><td>${a.id}</td><td>${escapeHtml(a.category)}</td><td>${escapeHtml(a.title)}</td><td><mark>${escapeHtml(a.status)}</mark></td></tr>`
    )
    .join('')

  const therapyRows = listTherapies()
    .map(
      (t) =>
        `<tr><td>${escapeHtml(t.name)}</td><td>${escapeHtml(t.categories.join(', '))}</td></tr>`
    )
    .join('')

  const appointmentRows = listAppointments()
    .map((appt) => {
      const therapy = getTherapy(appt.therapyId)
      const slot = getSlot(appt.slotId)
      return `<tr><td>${escapeHtml(appt.agentId)}</td><td>${escapeHtml(therapy?.name ?? 'Unknown')}</td><td>${escapeHtml(slot?.timeSlot ?? 'Unknown')}</td></tr>`
    })
    .join('')

  const content = `
    <h1>Dashboard</h1>

    <section>
      <h2>Ailments</h2>
      <table>
        <thead><tr><th>ID</th><th>Category</th><th>Title</th><th>Status</th></tr></thead>
        <tbody>${ailmentRows || '<tr><td colspan="4">No ailments reported yet.</td></tr>'}</tbody>
      </table>
    </section>

    <section>
      <h2>Therapies</h2>
      <table>
        <thead><tr><th>Name</th><th>Categories</th></tr></thead>
        <tbody>${therapyRows}</tbody>
      </table>
    </section>

    <section>
      <h2>Appointments</h2>
      <table>
        <thead><tr><th>Agent</th><th>Therapy</th><th>Time</th></tr></thead>
        <tbody>${appointmentRows || '<tr><td colspan="3">No appointments booked yet.</td></tr>'}</tbody>
      </table>
    </section>
  `
  return c.html(layout('AgentClinic — Dashboard', content))
})
