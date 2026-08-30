import { Hono } from 'hono'
import {
  appointmentForm,
  type AppointmentFormValues,
  type AppointmentSlotOption,
  type AppointmentTherapyOption,
} from '../components/appointmentForm'
import { escapeHtml } from '../html'
import { layout } from '../layout'
import {
  createAppointment,
  deleteAppointment,
  getAppointment,
  getSlot,
  getTherapy,
  listAvailableSlots,
  listTherapies,
  updateAppointment,
} from '../store'
import { isNonEmptyString, parsePositiveInt } from '../validation'

// Server-rendered HTML pages for creating, editing, and deleting an
// Appointment — mounted at /appointments in src/app.ts. Separate from
// src/routes/appointments.ts (the /api/appointments JSON API), which
// this file does not touch. Like the JSON routes, everything here goes
// through src/store.ts — never src/db/repository/* directly. Mirrors
// src/routes/ailmentsUi.ts's structure.

export const appointmentsUi = new Hono()

function formString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Deterministic, timezone-explicit "YYYY-MM-DD HH:MM UTC" label. */
function formatSlotLabel(timeSlot: string): string {
  const iso = new Date(timeSlot).toISOString()
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`
}

function renderNotFound(message: string): string {
  return layout(
    'AgentClinic — Not Found',
    `
      <h1>Not Found</h1>
      <p>${escapeHtml(message)}</p>
      <p><a href="/dashboard">Back to dashboard</a></p>
    `
  )
}

async function buildTherapyOptions(): Promise<AppointmentTherapyOption[]> {
  const therapies = await listTherapies()
  return therapies.map((t) => ({ id: t.id, name: t.name }))
}

/**
 * Every currently available slot, plus — when editing — the
 * appointment's own current slot, which is `taken` (by this
 * appointment) and so wouldn't otherwise appear. The current slot is
 * marked `isCurrent` and never duplicated if it's somehow already in
 * the available list.
 */
async function buildSlotOptions(currentSlotId?: number): Promise<AppointmentSlotOption[]> {
  const available = await listAvailableSlots()
  const options: AppointmentSlotOption[] = available.map((s) => ({
    id: s.id,
    label: formatSlotLabel(s.timeSlot),
  }))

  if (currentSlotId !== undefined && !options.some((o) => o.id === currentSlotId)) {
    const currentSlot = await getSlot(currentSlotId)
    if (currentSlot) {
      options.push({ id: currentSlot.id, label: formatSlotLabel(currentSlot.timeSlot), isCurrent: true })
    }
  }

  return options.sort((a, b) => a.id - b.id)
}

function renderFormPage(
  mode: 'new' | 'edit',
  id: number | undefined,
  values: AppointmentFormValues,
  therapyOptions: AppointmentTherapyOption[],
  slotOptions: AppointmentSlotOption[],
  errorMessage?: string
): string {
  const title = mode === 'new' ? 'AgentClinic — New Appointment' : 'AgentClinic — Edit Appointment'
  return layout(title, appointmentForm({ mode, id, values, therapyOptions, slotOptions, errorMessage }))
}

function messageForReason(reason: 'therapy_not_found' | 'slot_not_found' | 'slot_taken'): string {
  switch (reason) {
    case 'slot_taken':
      return 'That slot was just taken by someone else. Please choose another.'
    case 'therapy_not_found':
      return 'Selected therapy no longer exists.'
    case 'slot_not_found':
      return 'Selected slot no longer exists.'
  }
}

appointmentsUi.get('/new', async (c) => {
  const [therapyOptions, slotOptions] = await Promise.all([buildTherapyOptions(), buildSlotOptions()])
  return c.html(
    renderFormPage('new', undefined, { agentId: '', therapyId: '', slotId: '' }, therapyOptions, slotOptions)
  )
})

appointmentsUi.post('/new', async (c) => {
  const body = await c.req.parseBody()
  const values: AppointmentFormValues = {
    agentId: formString(body.agentId),
    therapyId: formString(body.therapyId),
    slotId: formString(body.slotId),
  }

  const therapyId = parsePositiveInt(values.therapyId)
  const slotId = parsePositiveInt(values.slotId)

  if (!isNonEmptyString(values.agentId) || therapyId === null || slotId === null) {
    const [therapyOptions, slotOptions] = await Promise.all([buildTherapyOptions(), buildSlotOptions()])
    return c.html(
      renderFormPage(
        'new',
        undefined,
        values,
        therapyOptions,
        slotOptions,
        'Agent ID, therapy, and slot are all required.'
      ),
      400
    )
  }

  const result = await createAppointment({ agentId: values.agentId, therapyId, slotId })

  if (!result.ok) {
    const [therapyOptions, slotOptions] = await Promise.all([buildTherapyOptions(), buildSlotOptions()])
    const status = result.reason === 'slot_taken' ? 409 : 404
    return c.html(
      renderFormPage('new', undefined, values, therapyOptions, slotOptions, messageForReason(result.reason)),
      status
    )
  }

  return c.redirect('/dashboard', 303)
})

appointmentsUi.get('/:id/edit', async (c) => {
  const id = Number(c.req.param('id'))
  const appointment = await getAppointment(id)
  if (!appointment) {
    return c.html(renderNotFound('This appointment no longer exists.'), 404)
  }

  const [therapyOptions, slotOptions] = await Promise.all([
    buildTherapyOptions(),
    buildSlotOptions(appointment.slotId),
  ])

  return c.html(
    renderFormPage(
      'edit',
      appointment.id,
      {
        agentId: appointment.agentId,
        therapyId: String(appointment.therapyId),
        slotId: String(appointment.slotId),
      },
      therapyOptions,
      slotOptions
    )
  )
})

appointmentsUi.post('/:id/edit', async (c) => {
  const id = Number(c.req.param('id'))
  const existing = await getAppointment(id)
  if (!existing) {
    return c.html(renderNotFound('This appointment no longer exists.'), 404)
  }

  const body = await c.req.parseBody()
  const values: AppointmentFormValues = {
    agentId: formString(body.agentId),
    therapyId: formString(body.therapyId),
    slotId: formString(body.slotId),
  }

  const therapyId = parsePositiveInt(values.therapyId)
  const slotId = parsePositiveInt(values.slotId)

  if (!isNonEmptyString(values.agentId) || therapyId === null || slotId === null) {
    const [therapyOptions, slotOptions] = await Promise.all([
      buildTherapyOptions(),
      buildSlotOptions(existing.slotId),
    ])
    return c.html(
      renderFormPage(
        'edit',
        id,
        values,
        therapyOptions,
        slotOptions,
        'Agent ID, therapy, and slot are all required.'
      ),
      400
    )
  }

  const result = await updateAppointment(id, { agentId: values.agentId, therapyId, slotId })

  if (!result.ok) {
    if (result.reason === 'appointment_not_found') {
      // Rare race: deleted between the getAppointment check above and here.
      return c.html(renderNotFound('This appointment no longer exists.'), 404)
    }

    const [therapyOptions, slotOptions] = await Promise.all([
      buildTherapyOptions(),
      buildSlotOptions(existing.slotId),
    ])
    const status = result.reason === 'slot_taken' ? 409 : 404
    return c.html(
      renderFormPage('edit', id, values, therapyOptions, slotOptions, messageForReason(result.reason)),
      status
    )
  }

  return c.redirect('/dashboard', 303)
})

appointmentsUi.post('/:id/delete', async (c) => {
  const id = Number(c.req.param('id'))
  const result = await deleteAppointment(id)
  if (!result.ok) {
    return c.html(renderNotFound('This appointment no longer exists.'), 404)
  }

  return c.redirect('/dashboard', 303)
})
