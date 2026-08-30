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

async function createTestAilment(overrides: Partial<Record<string, string>> = {}) {
  const res = await app.request('/api/ailments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: 'agent-ui',
      category: 'performance',
      title: 'Original title',
      description: 'Original description.',
      ...overrides,
    }),
  })
  return res.json()
}

describe('GET /ailments/new', () => {
  it('renders a create form with all required fields', async () => {
    const res = await app.request('/ailments/new')
    const body = await res.text()

    expect(res.status).toBe(200)
    expect(body).toContain('<h1>New Ailment</h1>')
    expect(body).toContain('name="agentId"')
    expect(body).toContain('name="category"')
    expect(body).toContain('name="title"')
    expect(body).toContain('name="description"')
    expect(body).toContain('<textarea')
    expect(body).toContain('<select id="category" name="category" required>')
    // All 5 CATEGORIES values present as options
    for (const category of ['performance', 'reliability', 'integration', 'auth', 'other']) {
      expect(body).toContain(`>${category}</option>`)
    }
    // Required fields clearly marked
    expect(body).toContain('aria-hidden="true">*</span>')
    expect(body).toContain('method="POST"')
    expect(body).toContain('action="/ailments/new"')
  })
})

describe('POST /ailments/new', () => {
  it('creates an ailment with status "open" and redirects 303 to /dashboard', async () => {
    const res = await app.request('/ailments/new', {
      method: 'POST',
      headers: FORM_HEADERS,
      body: formBody({
        agentId: 'agent-form',
        category: 'auth',
        title: 'Created via form',
        description: 'Created via the HTML form, not the JSON API.',
      }),
      redirect: 'manual',
    })

    expect(res.status).toBe(303)
    expect(res.headers.get('Location')).toBe('/dashboard')

    const list = await (await app.request('/api/ailments')).json()
    const created = list.find((a: { agentId: string }) => a.agentId === 'agent-form')
    expect(created).toBeDefined()
    expect(created.status).toBe('open')
    expect(created.title).toBe('Created via form')
  })

  it('returns 400 and re-renders the form on missing fields', async () => {
    const res = await app.request('/ailments/new', {
      method: 'POST',
      headers: FORM_HEADERS,
      body: formBody({ agentId: 'agent-bad', category: '', title: '', description: '' }),
    })
    const body = await res.text()

    expect(res.status).toBe(400)
    expect(body).toContain('<h1>New Ailment</h1>')
    expect(body).toContain('class="form-error"')
  })

  it('returns 400 for an invalid category', async () => {
    const res = await app.request('/ailments/new', {
      method: 'POST',
      headers: FORM_HEADERS,
      body: formBody({
        agentId: 'agent-bad-cat',
        category: 'not-a-real-category',
        title: 'Title',
        description: 'Description',
      }),
    })

    expect(res.status).toBe(400)
    expect(await res.text()).toContain('class="form-error"')
  })

  it('preserves valid entered values after a validation failure', async () => {
    const res = await app.request('/ailments/new', {
      method: 'POST',
      headers: FORM_HEADERS,
      body: formBody({
        agentId: 'agent-preserve',
        category: 'auth',
        title: 'Kept title',
        description: '', // invalid: missing
      }),
    })
    const body = await res.text()

    expect(res.status).toBe(400)
    expect(body).toContain('value="agent-preserve"')
    expect(body).toContain('value="Kept title"')
    expect(body).toContain('>auth</option>')
  })

  it('escapes a malicious title instead of executing it', async () => {
    const res = await app.request('/ailments/new', {
      method: 'POST',
      headers: FORM_HEADERS,
      body: formBody({
        agentId: 'agent-xss',
        category: 'other',
        title: '', // trigger a 400 so the malicious value round-trips into the re-rendered form
        description: '<script>alert(1)</script>',
      }),
    })
    const body = await res.text()

    expect(res.status).toBe(400)
    expect(body).not.toContain('<script>alert(1)</script>')
    expect(body).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('handles non-string form values (e.g. a duplicated field) safely instead of crashing', async () => {
    // URLSearchParams naturally supports repeated keys; parseBody() may
    // return an array for a repeated field name rather than a string.
    const params = new URLSearchParams()
    params.append('agentId', 'agent-dup')
    params.append('agentId', 'agent-dup-2')
    params.append('category', 'other')
    params.append('title', 'Title')
    params.append('description', 'Description')

    const res = await app.request('/ailments/new', {
      method: 'POST',
      headers: FORM_HEADERS,
      body: params.toString(),
    })

    // Either it's treated as invalid (400, safely) or handled as a
    // single string — the key requirement is no unhandled exception /
    // 500.
    expect([201, 303, 400]).not.toContain(500)
    expect(res.status).not.toBe(500)
  })
})

describe('GET /ailments/:id/edit', () => {
  it('renders the edit form pre-populated with current values', async () => {
    const created = await createTestAilment({ agentId: 'agent-edit', title: 'Edit me' })

    const res = await app.request(`/ailments/${created.id}/edit`)
    const body = await res.text()

    expect(res.status).toBe(200)
    expect(body).toContain('<h1>Edit Ailment</h1>')
    expect(body).toContain(`action="/ailments/${created.id}/edit"`)
    expect(body).toContain('value="agent-edit"')
    expect(body).toContain('value="Edit me"')
    expect(body).toContain('>Original description.</textarea>')
    expect(body).toContain('>performance</option>')
    expect(body).toContain('<select id="status" name="status" required>')
    expect(body).toContain('value="open" selected')
  })

  it('returns a user-friendly 404 page for an unknown ailment', async () => {
    const res = await app.request('/ailments/999999/edit')
    const body = await res.text()

    expect(res.status).toBe(404)
    expect(body).toContain('<h1>Not Found</h1>')
    expect(body).not.toContain('{"error"')
  })
})

describe('POST /ailments/:id/edit', () => {
  it('updates the ailment and redirects 303 to /dashboard', async () => {
    const created = await createTestAilment()

    const res = await app.request(`/ailments/${created.id}/edit`, {
      method: 'POST',
      headers: FORM_HEADERS,
      body: formBody({
        agentId: 'agent-updated',
        category: 'auth',
        title: 'Updated title',
        description: 'Updated description.',
        status: 'resolved',
      }),
      redirect: 'manual',
    })

    expect(res.status).toBe(303)
    expect(res.headers.get('Location')).toBe('/dashboard')

    const updated = await (await app.request(`/api/ailments/${created.id}`)).json()
    expect(updated).toMatchObject({
      agentId: 'agent-updated',
      category: 'auth',
      title: 'Updated title',
      description: 'Updated description.',
      status: 'resolved',
    })
  })

  it('does not change other ailments', async () => {
    const target = await createTestAilment({ agentId: 'agent-target' })
    const other = await createTestAilment({ agentId: 'agent-other', title: 'Untouched' })

    await app.request(`/ailments/${target.id}/edit`, {
      method: 'POST',
      headers: FORM_HEADERS,
      body: formBody({
        agentId: 'agent-target-renamed',
        category: 'performance',
        title: 'Changed',
        description: 'Changed.',
        status: 'open',
      }),
    })

    const untouched = await (await app.request(`/api/ailments/${other.id}`)).json()
    expect(untouched).toEqual(other)
  })

  it('returns 400 and preserves submitted values on invalid input', async () => {
    const created = await createTestAilment()

    const res = await app.request(`/ailments/${created.id}/edit`, {
      method: 'POST',
      headers: FORM_HEADERS,
      body: formBody({
        agentId: 'agent-invalid-edit',
        category: 'auth',
        title: 'Kept',
        description: 'Kept description.',
        status: 'not-a-real-status',
      }),
    })
    const body = await res.text()

    expect(res.status).toBe(400)
    expect(body).toContain('class="form-error"')
    expect(body).toContain('value="agent-invalid-edit"')
    expect(body).toContain('value="Kept"')

    const unchanged = await (await app.request(`/api/ailments/${created.id}`)).json()
    expect(unchanged).toEqual(created)
  })

  it('returns a user-friendly 404 page when editing an unknown ailment', async () => {
    const res = await app.request('/ailments/999999/edit', {
      method: 'POST',
      headers: FORM_HEADERS,
      body: formBody({
        agentId: 'x',
        category: 'other',
        title: 'x',
        description: 'x',
        status: 'open',
      }),
    })
    const body = await res.text()

    expect(res.status).toBe(404)
    expect(body).toContain('<h1>Not Found</h1>')
  })
})

describe('POST /ailments/:id/delete', () => {
  it('deletes the ailment and redirects 303 to /dashboard', async () => {
    const created = await createTestAilment()

    const res = await app.request(`/ailments/${created.id}/delete`, {
      method: 'POST',
      redirect: 'manual',
    })

    expect(res.status).toBe(303)
    expect(res.headers.get('Location')).toBe('/dashboard')

    const getRes = await app.request(`/api/ailments/${created.id}`)
    expect(getRes.status).toBe(404)
  })

  it('returns a user-friendly 404 page for an unknown ailment', async () => {
    const res = await app.request('/ailments/999999/delete', { method: 'POST' })
    const body = await res.text()

    expect(res.status).toBe(404)
    expect(body).toContain('<h1>Not Found</h1>')
  })

  it('does not delete via GET', async () => {
    const created = await createTestAilment()

    const res = await app.request(`/ailments/${created.id}/delete`)
    expect(res.status).not.toBe(303)
    expect(res.status).not.toBe(204)

    // Still present — a GET must not have deleted it.
    const stillThere = await app.request(`/api/ailments/${created.id}`)
    expect(stillThere.status).toBe(200)
  })
})

describe('/dashboard Ailments controls', () => {
  it('shows a New Ailment link, and per-row Edit/Delete controls with a confirmation prompt', async () => {
    const created = await createTestAilment({ agentId: 'agent-dashboard-controls' })

    const body = await (await app.request('/dashboard')).text()

    expect(body).toContain('href="/ailments/new"')
    expect(body).toContain(`href="/ailments/${created.id}/edit"`)
    expect(body).toContain(`action="/ailments/${created.id}/delete"`)
    expect(body).toContain('method="POST"')
    expect(body).toContain(`onsubmit="return confirm('Delete this ailment?')"`)
  })

  it('escapes a malicious ailment title on the dashboard', async () => {
    await createTestAilment({
      agentId: 'agent-xss-dashboard',
      title: '</td></tr><script>alert(1)</script>',
    })

    const body = await (await app.request('/dashboard')).text()

    expect(body).not.toContain('<script>alert(1)</script>')
    expect(body).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })
})
