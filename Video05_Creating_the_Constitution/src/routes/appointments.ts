import { Hono } from 'hono'
import {
  createAppointment,
  deleteAppointment,
  getAppointment,
  listAppointments,
  updateAppointment,
} from '../store'
import { getIdempotentResponse, saveIdempotentResponse } from '../idempotency'
import { isNonEmptyString, parseJsonBody, parsePositiveInt } from '../validation'

export const appointments = new Hono()

appointments.post('/', async (c) => {
  const idempotencyKey = c.req.header('Idempotency-Key')
  if (idempotencyKey) {
    const cached = getIdempotentResponse(`appointments:${idempotencyKey}`)
    if (cached) return c.json(cached.body as object, cached.status as 201)
  }

  const parsed = parseJsonBody(await c.req.text())
  if (!parsed.ok) {
    return c.json({ error: 'request body must be valid JSON' }, 400)
  }
  const { agentId, therapyId: rawTherapyId, slotId: rawSlotId } = parsed.body
  const therapyId = parsePositiveInt(rawTherapyId)
  const slotId = parsePositiveInt(rawSlotId)

  if (!isNonEmptyString(agentId) || therapyId === null || slotId === null) {
    return c.json(
      {
        error:
          'agentId (string), therapyId (positive integer), and slotId (positive integer) are required',
      },
      400
    )
  }

  const result = await createAppointment({ agentId, therapyId, slotId })

  if (!result.ok) {
    if (result.reason === 'slot_taken') {
      return c.json({ error: 'slot already taken' }, 409)
    }
    return c.json({ error: result.reason.replace('_', ' ') }, 404)
  }

  if (idempotencyKey) {
    saveIdempotentResponse(`appointments:${idempotencyKey}`, {
      status: 201,
      body: result.appointment,
    })
  }
  return c.json(result.appointment, 201)
})

appointments.get('/', async (c) => c.json(await listAppointments()))

appointments.get('/:id', async (c) => {
  const appointment = await getAppointment(Number(c.req.param('id')))
  if (!appointment) return c.json({ error: 'appointment not found' }, 404)
  return c.json(appointment)
})

appointments.patch('/:id', async (c) => {
  const id = Number(c.req.param('id'))

  const parsed = parseJsonBody(await c.req.text())
  if (!parsed.ok) {
    return c.json({ error: 'request body must be valid JSON' }, 400)
  }
  const { agentId, therapyId: rawTherapyId, slotId: rawSlotId } = parsed.body

  if (agentId === undefined && rawTherapyId === undefined && rawSlotId === undefined) {
    return c.json(
      { error: 'at least one of agentId, therapyId, slotId is required' },
      400
    )
  }

  if (agentId !== undefined && !isNonEmptyString(agentId)) {
    return c.json({ error: 'agentId must be a non-empty string' }, 400)
  }

  let therapyId: number | undefined
  if (rawTherapyId !== undefined) {
    const parsedTherapyId = parsePositiveInt(rawTherapyId)
    if (parsedTherapyId === null) {
      return c.json({ error: 'therapyId must be a positive integer' }, 400)
    }
    therapyId = parsedTherapyId
  }

  let slotId: number | undefined
  if (rawSlotId !== undefined) {
    const parsedSlotId = parsePositiveInt(rawSlotId)
    if (parsedSlotId === null) {
      return c.json({ error: 'slotId must be a positive integer' }, 400)
    }
    slotId = parsedSlotId
  }

  const result = await updateAppointment(id, {
    agentId: agentId as string | undefined,
    therapyId,
    slotId,
  })

  if (!result.ok) {
    if (result.reason === 'slot_taken') {
      return c.json({ error: 'slot already taken' }, 409)
    }
    return c.json({ error: result.reason.replace(/_/g, ' ') }, 404)
  }

  return c.json(result.appointment)
})

appointments.delete('/:id', async (c) => {
  const result = await deleteAppointment(Number(c.req.param('id')))
  if (!result.ok) return c.json({ error: 'appointment not found' }, 404)
  return c.body(null, 204)
})
