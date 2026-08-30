import { Hono } from 'hono'
import {
  CATEGORIES,
  createAilment,
  getAilment,
  listAilments,
  therapiesForAilment,
  type Category,
} from '../store'
import { getIdempotentResponse, saveIdempotentResponse } from '../idempotency'
import { isNonEmptyString, parseJsonBody } from '../validation'

export const ailments = new Hono()

ailments.post('/', async (c) => {
  const idempotencyKey = c.req.header('Idempotency-Key')
  if (idempotencyKey) {
    const cached = getIdempotentResponse(`ailments:${idempotencyKey}`)
    if (cached) return c.json(cached.body as object, cached.status as 201)
  }

  const parsed = parseJsonBody(await c.req.text())
  if (!parsed.ok) {
    return c.json({ error: 'request body must be valid JSON' }, 400)
  }
  const { agentId, category, title, description } = parsed.body

  if (
    !isNonEmptyString(agentId) ||
    !isNonEmptyString(category) ||
    !isNonEmptyString(title) ||
    !isNonEmptyString(description)
  ) {
    return c.json(
      {
        error:
          'agentId, category, title, and description are required strings',
      },
      400
    )
  }
  if (!CATEGORIES.includes(category as Category)) {
    return c.json(
      { error: `category must be one of: ${CATEGORIES.join(', ')}` },
      400
    )
  }

  const ailment = await createAilment({
    agentId,
    category: category as Category,
    title,
    description,
  })
  if (idempotencyKey) {
    saveIdempotentResponse(`ailments:${idempotencyKey}`, {
      status: 201,
      body: ailment,
    })
  }
  return c.json(ailment, 201)
})

ailments.get('/', async (c) => c.json(await listAilments()))

ailments.get('/:id', async (c) => {
  const ailment = await getAilment(Number(c.req.param('id')))
  if (!ailment) return c.json({ error: 'ailment not found' }, 404)
  return c.json(ailment)
})

ailments.get('/:id/therapies', async (c) => {
  const therapies = await therapiesForAilment(Number(c.req.param('id')))
  if (!therapies) return c.json({ error: 'ailment not found' }, 404)
  return c.json(therapies)
})
