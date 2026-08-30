import { escapeHtml } from '../html'
import { CATEGORIES } from '../store'

// Reusable HTML for both the "new ailment" and "edit ailment" pages
// (src/routes/ailmentsUi.ts) — kept in one place so create/edit never
// drift into two slightly different forms. Renders only the form
// fragment; callers wrap it with layout().

export interface AilmentFormValues {
  agentId: string
  category: string
  title: string
  description: string
  status?: string
}

export interface AilmentFormOptions {
  mode: 'new' | 'edit'
  id?: number
  values: AilmentFormValues
  errorMessage?: string
}

export function ailmentForm(options: AilmentFormOptions): string {
  const { mode, id, values, errorMessage } = options
  const actionPath = mode === 'new' ? '/ailments/new' : `/ailments/${id}/edit`
  const heading = mode === 'new' ? 'New Ailment' : 'Edit Ailment'

  const categoryOptions = CATEGORIES.map((category) => {
    const selected = values.category === category ? ' selected' : ''
    const escaped = escapeHtml(category)
    return `<option value="${escaped}"${selected}>${escaped}</option>`
  }).join('')

  const statusField =
    mode === 'edit'
      ? `
        <label for="status">Status <span aria-hidden="true">*</span></label>
        <select id="status" name="status" required>
          <option value="open"${values.status === 'open' ? ' selected' : ''}>open</option>
          <option value="resolved"${values.status === 'resolved' ? ' selected' : ''}>resolved</option>
        </select>
      `
      : ''

  const errorBlock = errorMessage
    ? `<p class="form-error" role="alert">${escapeHtml(errorMessage)}</p>`
    : ''

  return `
    <h1>${heading}</h1>
    <p><small>Fields marked <span aria-hidden="true">*</span> are required.</small></p>
    ${errorBlock}
    <form method="POST" action="${escapeHtml(actionPath)}">
      <label for="agentId">Agent ID <span aria-hidden="true">*</span></label>
      <input
        type="text"
        id="agentId"
        name="agentId"
        value="${escapeHtml(values.agentId)}"
        required
      />

      <label for="category">Category <span aria-hidden="true">*</span></label>
      <select id="category" name="category" required>
        <option value="" disabled${values.category ? '' : ' selected'}>Select a category</option>
        ${categoryOptions}
      </select>

      <label for="title">Title <span aria-hidden="true">*</span></label>
      <input
        type="text"
        id="title"
        name="title"
        value="${escapeHtml(values.title)}"
        required
      />

      <label for="description">Description <span aria-hidden="true">*</span></label>
      <textarea id="description" name="description" required>${escapeHtml(values.description)}</textarea>

      ${statusField}

      <button type="submit">${mode === 'new' ? 'Create ailment' : 'Save changes'}</button>
      <a href="/dashboard" role="button" class="secondary">Cancel</a>
    </form>
  `
}
