import { Hono } from 'hono'
import {
  CATEGORIES,
  createAilment,
  deleteAilment,
  getAilment,
  listAilments,
  therapiesForAilment,
  updateAilment,
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

ailments.patch('/:id', async (c) => {
  const id = Number(c.req.param('id'))

  const parsed = parseJsonBody(await c.req.text())
  if (!parsed.ok) {
    return c.json({ error: 'request body must be valid JSON' }, 400)
  }
  const { agentId, category, title, description, status } = parsed.body

  if (
    agentId === undefined &&
    category === undefined &&
    title === undefined &&
    description === undefined &&
    status === undefined
  ) {
    return c.json(
      {
        error:
          'at least one of agentId, category, title, description, status is required',
      },
      400
    )
  }

  if (agentId !== undefined && !isNonEmptyString(agentId)) {
    return c.json({ error: 'agentId must be a non-empty string' }, 400)
  }
  if (title !== undefined && !isNonEmptyString(title)) {
    return c.json({ error: 'title must be a non-empty string' }, 400)
  }
  if (description !== undefined && !isNonEmptyString(description)) {
    return c.json({ error: 'description must be a non-empty string' }, 400)
  }
  if (
    category !== undefined &&
    (!isNonEmptyString(category) || !CATEGORIES.includes(category as Category))
  ) {
    return c.json(
      { error: `category must be one of: ${CATEGORIES.join(', ')}` },
      400
    )
  }
  if (status !== undefined && status !== 'open' && status !== 'resolved') {
    return c.json({ error: "status must be 'open' or 'resolved'" }, 400)
  }

  const updated = await updateAilment(id, {
    agentId: agentId as string | undefined,
    category: category as Category | undefined,
    title: title as string | undefined,
    description: description as string | undefined,
    status: status as 'open' | 'resolved' | undefined,
  })

  if (!updated) return c.json({ error: 'ailment not found' }, 404)
  return c.json(updated)
})

ailments.delete('/:id', async (c) => {
  const deleted = await deleteAilment(Number(c.req.param('id')))
  if (!deleted) return c.json({ error: 'ailment not found' }, 404)
  return c.body(null, 204)
})
