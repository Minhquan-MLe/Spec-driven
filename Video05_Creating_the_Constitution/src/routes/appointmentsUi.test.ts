import { beforeEach, describe, expect, it, vi } from 'vitest'

// Uses the in-memory manual mock at src/__mocks__/store.ts instead of
// the real ../store (which talks to PostgreSQL) — keeps this suite
// independent of a live database.
vi.mock('../store')

import { app } from '../app'
import { resetIdempotencyCache } from '../idempotency'
import { resetMockStore } from '../store'

beforeEach(() => {
  resetMockStore()
  resetIdempotencyCache()
})

function formBody(fields: Record<string, string>): string {
  return new URLSearchParams(fields).toString()
}

const FORM_HEADERS = { 'Content-Type': 'application/x-www-form-urlencoded' }

async function availableSlots(): Promise<Array<{ id: number; timeSlot: string; taken: boolean }>> {
  return (await app.request('/api/slots')).json()
}

/**
 * The therapy <select> and the slot <select> can share numeric option
 * values (e.g. both may have a "value=1" option), so assertions about
 * which slots are/aren't offered must be scoped to the slot <select>
 * specifically, not the whole page.
 */
function extractSlotSelect(html: string): string {
  const start = html.indexOf('<select id="slotId"')
  if (start === -1) return ''
  const end = html.indexOf('</select>', start)
  return html.slice(start, end)
}

async function bookTestAppointment(overrides: { agentId?: string; therapyId?: number; slotId?: number } = {}) {
  const slotId = overrides.slotId ?? (await availableSlots())[0].id
  const res = await app.request('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: overrides.agentId ?? 'agent-ui',
      therapyId: overrides.therapyId ?? 1,
      slotId,
    }),
  })
  return res.json()
}

describe('GET /appointments/new', () => {
  it('renders a create form with agentId, therapy options, and available-slot options', async () => {
    const res = await app.request('/appointments/new')
    const body = await res.text()

    expect(res.status).toBe(200)
    expect(body).toContain('<h1>New Appointment</h1>')
    expect(body).toContain('name="agentId"')
    expect(body).toContain('<select id="therapyId" name="therapyId" required>')
    expect(body).toContain('<select id="slotId" name="slotId" required>')
    expect(body).toContain('action="/appointments/new"')
  })

  it('shows human-readable therapy names with numeric ids as option values', async () => {
    const body = await (await app.request('/appointments/new')).text()

    expect(body).toContain('<option value="1">Timeout Tuning Session</option>')
    expect(body).toContain('<option value="4">Credential Refresh Clinic</option>')
  })

  it('shows human-readable slot date/time labels with numeric ids as option values', async () => {
    const slots = await availableSlots()
    const body = await (await app.request('/appointments/new')).text()

    for (const slot of slots) {
      const isoDate = slot.timeSlot.slice(0, 10)
      expect(body).toContain(`value="${slot.id}"`)
      expect(body).toContain(isoDate)
    }
    // Never just the bare numeric id as the visible label.
    expect(body).not.toMatch(/>1<\/option>/)
  })

  it('only offers currently available (untaken) slots when creating', async () => {
    const [firstSlot] = await availableSlots()
    await bookTestAppointment({ slotId: firstSlot.id })

    const body = await (await app.request('/appointments/new')).text()

    expect(extractSlotSelect(body)).not.toContain(`value="${firstSlot.id}"`)
  })

  it('shows a clear message and disables submission when no slots are available', async () => {
    const slots = await availableSlots()
    for (const slot of slots) {
      await bookTestAppointment({ agentId: `filler-${slot.id}`, slotId: slot.id })
    }

    const res = await app.request('/appointments/new')
    const body = await res.text()

    expect(res.status).toBe(200)
    expect(body).not.toContain('<select id="slotId"')
    expect(body).toMatch(/no.*slots.*available/i)
    expect(body).toContain('<button type="submit" disabled>')
  })
})

describe('POST /appointments/new', () => {
  it('creates an appointment and redirects 303 to /dashboard', async () => {
    const [slot] = await availableSlots()

    const res = await app.request('/appointments/new', {
      method: 'POST',
      headers: FORM_HEADERS,
      body: formBody({ agentId: 'agent-form', therapyId: '1', slotId: String(slot.id) }),
      redirect: 'manual',
    })

    expect(res.status).toBe(303)
    expect(res.headers.get('Location')).toBe('/dashboard')

    const list = await (await app.request('/api/appointments')).json()
    const created = list.find((a: { agentId: string }) => a.agentId === 'agent-form')
    expect(created).toBeDefined()
    expect(created.slotId).toBe(slot.id)
    expect(created.therapyId).toBe(1)
  })

  it('returns 400 and re-renders the form on missing fields', async () => {
    const res = await app.request('/appointments/new', {
      method: 'POST',
      headers: FORM_HEADERS,
      body: formBody({ agentId: '', therapyId: '', slotId: '' }),
    })
    const body = await res.text()

    expect(res.status).toBe(400)
    expect(body).toContain('<h1>New Appointment</h1>')
    expect(body).toContain('class="form-error"')
  })

  it('preserves entered agentId and selected therapy/slot after a validation failure', async () => {
    const res = await app.request('/appointments/new', {
      method: 'POST',
      headers: FORM_HEADERS,
      body: formBody({ agentId: 'agent-preserve', therapyId: '2', slotId: '' }),
    })
    const body = await res.text()

    expect(res.status).toBe(400)
    expect(body).toContain('value="agent-preserve"')
    expect(body).toContain('<option value="2" selected>')
  })

  it('returns 409 and a clear message if the slot is taken between page load and submission', async () => {
    const [slot] = await availableSlots()
    await bookTestAppointment({ agentId: 'agent-racer', slotId: slot.id })

    const res = await app.request('/appointments/new', {
      method: 'POST',
      headers: FORM_HEADERS,
      body: formBody({ agentId: 'agent-late', therapyId: '1', slotId: String(slot.id) }),
    })
    const body = await res.text()

    expect(res.status).toBe(409)
    expect(body).toMatch(/taken/i)
  })

  it('escapes a malicious agentId instead of executing it', async () => {
    const res = await app.request('/appointments/new', {
      method: 'POST',
      headers: FORM_HEADERS,
      body: formBody({ agentId: '<script>alert(1)</script>', therapyId: '', slotId: '' }),
    })
    const body = await res.text()

    expect(res.status).toBe(400)
    expect(body).not.toContain('<script>alert(1)</script>')
    expect(body).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })
})

describe('GET /appointments/:id/edit', () => {
  it('renders the edit form pre-populated with agentId, current therapy, and current slot', async () => {
    const created = await bookTestAppointment({ agentId: 'agent-edit', therapyId: 3 })

    const res = await app.request(`/appointments/${created.id}/edit`)
    const body = await res.text()

    expect(res.status).toBe(200)
    expect(body).toContain('<h1>Edit Appointment</h1>')
    expect(body).toContain(`action="/appointments/${created.id}/edit"`)
    expect(body).toContain('value="agent-edit"')
    expect(body).toContain('<option value="3" selected>API Contract Alignment</option>')
    expect(body).toContain(`value="${created.slotId}" selected`)
  })

  it('shows the current (taken) slot as a selected option, labeled as current, without duplicating it', async () => {
    const created = await bookTestAppointment()

    const body = await (await app.request(`/appointments/${created.id}/edit`)).text()
    const slotSelect = extractSlotSelect(body)

    const occurrences = slotSelect.split(`value="${created.slotId}"`).length - 1
    expect(occurrences).toBe(1)
    expect(slotSelect).toContain('(current)')
  })

  it('also shows the other currently available slots', async () => {
    const created = await bookTestAppointment()
    const remainingAvailable = await availableSlots()

    const body = await (await app.request(`/appointments/${created.id}/edit`)).text()
    const slotSelect = extractSlotSelect(body)

    expect(remainingAvailable.length).toBeGreaterThan(0)
    for (const slot of remainingAvailable) {
      expect(slotSelect).toContain(`value="${slot.id}"`)
    }
  })

  it('returns a user-friendly 404 page for an unknown appointment', async () => {
    const res = await app.request('/appointments/999999/edit')
    const body = await res.text()

    expect(res.status).toBe(404)
    expect(body).toContain('<h1>Not Found</h1>')
    expect(body).not.toContain('{"error"')
  })
})

describe('POST /appointments/:id/edit', () => {
  it('allows saving without changing the slot', async () => {
    const created = await bookTestAppointment()

    const res = await app.request(`/appointments/${created.id}/edit`, {
      method: 'POST',
      headers: FORM_HEADERS,
      body: formBody({
        agentId: 'agent-same-slot',
        therapyId: String(created.therapyId),
        slotId: String(created.slotId),
      }),
      redirect: 'manual',
    })

    expect(res.status).toBe(303)
    const updated = await (await app.request(`/api/appointments/${created.id}`)).json()
    expect(updated.slotId).toBe(created.slotId)
    expect(updated.agentId).toBe('agent-same-slot')
  })

  it('allows moving to another available slot, and releases the old slot', async () => {
    const slots = await availableSlots()
    const created = await bookTestAppointment({ slotId: slots[0].id })
    const newSlotId = slots[1].id

    const res = await app.request(`/appointments/${created.id}/edit`, {
      method: 'POST',
      headers: FORM_HEADERS,
      body: formBody({
        agentId: created.agentId,
        therapyId: String(created.therapyId),
        slotId: String(newSlotId),
      }),
      redirect: 'manual',
    })

    expect(res.status).toBe(303)

    const updated = await (await app.request(`/api/appointments/${created.id}`)).json()
    expect(updated.slotId).toBe(newSlotId)

    const stillAvailable = await availableSlots()
    expect(stillAvailable.some((s) => s.id === slots[0].id)).toBe(true)
    expect(stillAvailable.some((s) => s.id === newSlotId)).toBe(false)
  })

  it('returns 409 and re-renders with a clear message when the new slot is already taken', async () => {
    const slots = await availableSlots()
    const first = await bookTestAppointment({ agentId: 'agent-first', slotId: slots[0].id })
    const second = await bookTestAppointment({ agentId: 'agent-second', slotId: slots[1].id })

    const res = await app.request(`/appointments/${first.id}/edit`, {
      method: 'POST',
      headers: FORM_HEADERS,
      body: formBody({
        agentId: first.agentId,
        therapyId: String(first.therapyId),
        slotId: String(second.slotId),
      }),
    })
    const body = await res.text()

    expect(res.status).toBe(409)
    expect(body).toMatch(/taken/i)

    const unchanged = await (await app.request(`/api/appointments/${first.id}`)).json()
    expect(unchanged.slotId).toBe(slots[0].id)
  })

  it('returns 400 and preserves submitted values on invalid input', async () => {
    const created = await bookTestAppointment()

    const res = await app.request(`/appointments/${created.id}/edit`, {
      method: 'POST',
      headers: FORM_HEADERS,
      body: formBody({ agentId: '', therapyId: String(created.therapyId), slotId: String(created.slotId) }),
    })
    const body = await res.text()

    expect(res.status).toBe(400)
    expect(body).toContain('class="form-error"')
  })

  it('returns a user-friendly 404 page for an unknown appointment', async () => {
    const res = await app.request('/appointments/999999/edit', {
      method: 'POST',
      headers: FORM_HEADERS,
      body: formBody({ agentId: 'x', therapyId: '1', slotId: '1' }),
    })
    const body = await res.text()

    expect(res.status).toBe(404)
    expect(body).toContain('<h1>Not Found</h1>')
  })
})

describe('POST /appointments/:id/delete', () => {
  it('deletes the appointment, redirects 303 to /dashboard, and releases its slot', async () => {
    const created = await bookTestAppointment()

    const res = await app.request(`/appointments/${created.id}/delete`, {
      method: 'POST',
      redirect: 'manual',
    })

    expect(res.status).toBe(303)
    expect(res.headers.get('Location')).toBe('/dashboard')

    const getRes = await app.request(`/api/appointments/${created.id}`)
    expect(getRes.status).toBe(404)

    const slots = await availableSlots()
    expect(slots.some((s) => s.id === created.slotId)).toBe(true)
  })

  it('returns a user-friendly 404 page for an unknown appointment', async () => {
    const res = await app.request('/appointments/999999/delete', { method: 'POST' })
    const body = await res.text()

    expect(res.status).toBe(404)
    expect(body).toContain('<h1>Not Found</h1>')
  })

  it('does not delete via GET', async () => {
    const created = await bookTestAppointment()

    const res = await app.request(`/appointments/${created.id}/delete`)
    expect(res.status).not.toBe(303)

    const stillThere = await app.request(`/api/appointments/${created.id}`)
    expect(stillThere.status).toBe(200)
  })
})

describe('/dashboard Appointment controls', () => {
  it('shows a New Appointment link and per-row Edit/Delete controls with a confirmation prompt', async () => {
    const created = await bookTestAppointment({ agentId: 'agent-dashboard-controls' })

    const body = await (await app.request('/dashboard')).text()

    expect(body).toContain('href="/appointments/new"')
    expect(body).toContain(`href="/appointments/${created.id}/edit"`)
    expect(body).toContain(`action="/appointments/${created.id}/delete"`)
    expect(body).toContain('method="POST"')
    expect(body).toContain(`onsubmit="return confirm('Delete this appointment?')"`)
  })

  it('escapes a malicious agentId on the dashboard', async () => {
    await bookTestAppointment({ agentId: '<script>alert(1)</script>' })

    const body = await (await app.request('/dashboard')).text()

    expect(body).not.toContain('<script>alert(1)</script>')
    expect(body).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })
})
