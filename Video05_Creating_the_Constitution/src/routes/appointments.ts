import { Hono } from 'hono'
import { createAppointment, listAppointments } from '../store'

export const appointments = new Hono()

appointments.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  const agentId = body?.agentId
  const therapyId = body?.therapyId
  const slotId = body?.slotId

  if (!agentId || therapyId == null || slotId == null) {
    return c.json(
      { error: 'agentId, therapyId, and slotId are required' },
      400
    )
  }

  const result = createAppointment({
    agentId,
    therapyId: Number(therapyId),
    slotId: Number(slotId),
  })

  if (!result.ok) {
    if (result.reason === 'slot_taken') {
      return c.json({ error: 'slot already taken' }, 409)
    }
    return c.json({ error: result.reason.replace('_', ' ') }, 400)
  }

  return c.json(result.appointment, 201)
})

appointments.get('/', (c) => c.json(listAppointments()))
