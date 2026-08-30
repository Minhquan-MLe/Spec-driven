import { Hono } from 'hono'
import { ailmentForm, type AilmentFormValues } from '../components/ailmentForm'
import { escapeHtml } from '../html'
import { layout } from '../layout'
import {
  CATEGORIES,
  createAilment,
  deleteAilment,
  getAilment,
  updateAilment,
  type Category,
} from '../store'
import { isNonEmptyString } from '../validation'

// Server-rendered HTML pages for creating, editing, and deleting an
// Ailment — mounted at /ailments in src/app.ts. Separate from
// src/routes/ailments.ts (the /api/ailments JSON API), which this file
// does not touch. Like the JSON routes, everything here goes through
// src/store.ts — never src/db/repository/* directly.

export const ailmentsUi = new Hono()

function formString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function renderFormPage(mode: 'new' | 'edit', id: number | undefined, values: AilmentFormValues, errorMessage?: string): string {
  const title = mode === 'new' ? 'AgentClinic — New Ailment' : 'AgentClinic — Edit Ailment'
  return layout(title, ailmentForm({ mode, id, values, errorMessage }))
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

/**
 * Validates the four fields shared by create and edit. Returns an
 * error message (safe to show a user) if anything is invalid, or
 * undefined if the fields are all valid.
 */
function validateCoreFields(values: {
  agentId: string
  category: string
  title: string
  description: string
}): string | undefined {
  if (
    !isNonEmptyString(values.agentId) ||
    !isNonEmptyString(values.title) ||
    !isNonEmptyString(values.description) ||
    !isNonEmptyString(values.category)
  ) {
    return 'Agent ID, category, title, and description are all required.'
  }
  if (!CATEGORIES.includes(values.category as Category)) {
    return `Category must be one of: ${CATEGORIES.join(', ')}.`
  }
  return undefined
}

ailmentsUi.get('/new', (c) => {
  return c.html(
    renderFormPage('new', undefined, { agentId: '', category: '', title: '', description: '' })
  )
})

ailmentsUi.post('/new', async (c) => {
  const body = await c.req.parseBody()
  const values: AilmentFormValues = {
    agentId: formString(body.agentId),
    category: formString(body.category),
    title: formString(body.title),
    description: formString(body.description),
  }

  const errorMessage = validateCoreFields(values)
  if (errorMessage) {
    return c.html(renderFormPage('new', undefined, values, errorMessage), 400)
  }

  await createAilment({
    agentId: values.agentId,
    category: values.category as Category,
    title: values.title,
    description: values.description,
  })

  return c.redirect('/dashboard', 303)
})

ailmentsUi.get('/:id/edit', async (c) => {
  const id = Number(c.req.param('id'))
  const ailment = await getAilment(id)
  if (!ailment) {
    return c.html(renderNotFound('This ailment no longer exists.'), 404)
  }

  return c.html(
    renderFormPage('edit', ailment.id, {
      agentId: ailment.agentId,
      category: ailment.category,
      title: ailment.title,
      description: ailment.description,
      status: ailment.status,
    })
  )
})

ailmentsUi.post('/:id/edit', async (c) => {
  const id = Number(c.req.param('id'))
  const existing = await getAilment(id)
  if (!existing) {
    return c.html(renderNotFound('This ailment no longer exists.'), 404)
  }

  const body = await c.req.parseBody()
  const values: AilmentFormValues = {
    agentId: formString(body.agentId),
    category: formString(body.category),
    title: formString(body.title),
    description: formString(body.description),
    status: formString(body.status),
  }

  let errorMessage = validateCoreFields(values)
  if (!errorMessage && values.status !== 'open' && values.status !== 'resolved') {
    errorMessage = "Status must be 'open' or 'resolved'."
  }

  if (errorMessage) {
    return c.html(renderFormPage('edit', id, values, errorMessage), 400)
  }

  const updated = await updateAilment(id, {
    agentId: values.agentId,
    category: values.category as Category,
    title: values.title,
    description: values.description,
    status: values.status as 'open' | 'resolved',
  })

  if (!updated) {
    // Rare race: deleted between the getAilment check above and here.
    return c.html(renderNotFound('This ailment no longer exists.'), 404)
  }

  return c.redirect('/dashboard', 303)
})

ailmentsUi.post('/:id/delete', async (c) => {
  const id = Number(c.req.param('id'))
  const deleted = await deleteAilment(id)
  if (!deleted) {
    return c.html(renderNotFound('This ailment no longer exists.'), 404)
  }

  return c.redirect('/dashboard', 303)
})
