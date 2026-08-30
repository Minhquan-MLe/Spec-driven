"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ailmentForm = ailmentForm;
const html_1 = require("../html");
const store_1 = require("../store");
function ailmentForm(options) {
    const { mode, id, values, errorMessage } = options;
    const actionPath = mode === 'new' ? '/ailments/new' : `/ailments/${id}/edit`;
    const heading = mode === 'new' ? 'New Ailment' : 'Edit Ailment';
    const categoryOptions = store_1.CATEGORIES.map((category) => {
        const selected = values.category === category ? ' selected' : '';
        const escaped = (0, html_1.escapeHtml)(category);
        return `<option value="${escaped}"${selected}>${escaped}</option>`;
    }).join('');
    const statusField = mode === 'edit'
        ? `
        <label for="status">Status <span aria-hidden="true">*</span></label>
        <select id="status" name="status" required>
          <option value="open"${values.status === 'open' ? ' selected' : ''}>open</option>
          <option value="resolved"${values.status === 'resolved' ? ' selected' : ''}>resolved</option>
        </select>
      `
        : '';
    const errorBlock = errorMessage
        ? `<p class="form-error" role="alert">${(0, html_1.escapeHtml)(errorMessage)}</p>`
        : '';
    return `
    <h1>${heading}</h1>
    <p><small>Fields marked <span aria-hidden="true">*</span> are required.</small></p>
    ${errorBlock}
    <form method="POST" action="${(0, html_1.escapeHtml)(actionPath)}">
      <label for="agentId">Agent ID <span aria-hidden="true">*</span></label>
      <input
        type="text"
        id="agentId"
        name="agentId"
        value="${(0, html_1.escapeHtml)(values.agentId)}"
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
        value="${(0, html_1.escapeHtml)(values.title)}"
        required
      />

      <label for="description">Description <span aria-hidden="true">*</span></label>
      <textarea id="description" name="description" required>${(0, html_1.escapeHtml)(values.description)}</textarea>

      ${statusField}

      <button type="submit">${mode === 'new' ? 'Create ailment' : 'Save changes'}</button>
      <a href="/dashboard" role="button" class="secondary">Cancel</a>
    </form>
  `;
}
