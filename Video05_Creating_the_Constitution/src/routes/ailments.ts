import { Hono } from 'hono'
import {
  CATEGORIES,
  createAilment,
  getAilment,
  listAilments,
  therapiesForAilment,
} from '../store'

export const ailments = new Hono()

ailments.post('/', async (c) => {
  const body = await c.req.json().catch(() => null)
  const agentId = body?.agentId
  const category = body?.category
  const title = body?.title
  const description = body?.description

  if (!agentId || !category || !title || !description) {
    return c.json(
      { error: 'agentId, category, title, and description are required' },
      400
    )
  }
  if (!CATEGORIES.includes(category)) {
    return c.json(
      { error: `category must be one of: ${CATEGORIES.join(', ')}` },
      400
    )
  }

  const ailment = createAilment({ agentId, category, title, description })
  return c.json(ailment, 201)
})

ailments.get('/', (c) => c.json(listAilments()))

ailments.get('/:id', (c) => {
  const ailment = getAilment(Number(c.req.param('id')))
  if (!ailment) return c.json({ error: 'ailment not found' }, 404)
  return c.json(ailment)
})

ailments.get('/:id/therapies', (c) => {
  const therapies = therapiesForAilment(Number(c.req.param('id')))
  if (!therapies) return c.json({ error: 'ailment not found' }, 404)
  return c.json(therapies)
})
