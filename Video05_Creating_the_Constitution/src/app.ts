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

// Postgres queries can fail (connection dropped, constraint violation,
// etc.); without this, Hono's default error handling could leak a raw
// error message — potentially including SQL or connection details —
// back to the client. This ensures every unhandled failure becomes a
// generic, controlled response instead. There is no in-memory fallback
// here: a database failure is a real failure, surfaced as a 500.
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'internal server error' }, 500)
})

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

app.get('/dashboard', async (c) => {
  const [ailmentList, therapyList, appointmentList] = await Promise.all([
    listAilments(),
    listTherapies(),
    listAppointments(),
  ])

  const ailmentRows = ailmentList
    .map(
      (a) =>
        `<tr><td>${a.id}</td><td>${escapeHtml(a.category)}</td><td>${escapeHtml(a.title)}</td><td><mark>${escapeHtml(a.status)}</mark></td></tr>`
    )
    .join('')

  const therapyRows = therapyList
    .map(
      (t) =>
        `<tr><td>${escapeHtml(t.name)}</td><td>${escapeHtml(t.categories.join(', '))}</td></tr>`
    )
    .join('')

  const appointmentRows = (
    await Promise.all(
      appointmentList.map(async (appt) => {
        const [therapy, slot] = await Promise.all([
          getTherapy(appt.therapyId),
          getSlot(appt.slotId),
        ])
        return `<tr><td>${escapeHtml(appt.agentId)}</td><td>${escapeHtml(therapy?.name ?? 'Unknown')}</td><td>${escapeHtml(slot?.timeSlot ?? 'Unknown')}</td></tr>`
      })
    )
  ).join('')

  const content = `
    <h1>Dashboard</h1>

    <section>
      <h2>Ailments</h2>
      <div class="table-responsive">
        <table>
          <thead><tr><th>ID</th><th>Category</th><th>Title</th><th>Status</th></tr></thead>
          <tbody>${ailmentRows || '<tr><td colspan="4">No ailments reported yet.</td></tr>'}</tbody>
        </table>
      </div>
    </section>

    <section>
      <h2>Therapies</h2>
      <div class="table-responsive">
        <table>
          <thead><tr><th>Name</th><th>Categories</th></tr></thead>
          <tbody>${therapyRows}</tbody>
        </table>
      </div>
    </section>

    <section>
      <h2>Appointments</h2>
      <div class="table-responsive">
        <table>
          <thead><tr><th>Agent</th><th>Therapy</th><th>Time</th></tr></thead>
          <tbody>${appointmentRows || '<tr><td colspan="3">No appointments booked yet.</td></tr>'}</tbody>
        </table>
      </div>
    </section>
  `
  return c.html(layout('AgentClinic — Dashboard', content))
})
