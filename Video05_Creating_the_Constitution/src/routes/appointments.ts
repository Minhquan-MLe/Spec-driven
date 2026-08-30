import { Hono } from 'hono'
import { createAppointment, listAppointments } from '../store'
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
