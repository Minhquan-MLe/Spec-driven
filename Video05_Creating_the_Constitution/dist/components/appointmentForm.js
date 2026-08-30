"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentForm = appointmentForm;
const html_1 = require("../html");
function appointmentForm(options) {
    const { mode, id, values, therapyOptions, slotOptions, errorMessage } = options;
    const actionPath = mode === 'new' ? '/appointments/new' : `/appointments/${id}/edit`;
    const heading = mode === 'new' ? 'New Appointment' : 'Edit Appointment';
    const therapySelectOptions = therapyOptions
        .map((t) => {
        const selected = String(t.id) === values.therapyId ? ' selected' : '';
        return `<option value="${t.id}"${selected}>${(0, html_1.escapeHtml)(t.name)}</option>`;
    })
        .join('');
    const errorBlock = errorMessage
        ? `<p class="form-error" role="alert">${(0, html_1.escapeHtml)(errorMessage)}</p>`
        : '';
    // Only "new" can ever have zero slot options — "edit" always has at
    // least the appointment's own current slot (see buildSlotOptions in
    // the route module).
    const noSlotsAvailable = mode === 'new' && slotOptions.length === 0;
    const slotField = noSlotsAvailable
        ? `
      <label for="slotId">Slot <span aria-hidden="true">*</span></label>
      <p class="form-error" role="alert">No appointment slots are currently available. Please check back later.</p>
    `
        : `
      <label for="slotId">Slot <span aria-hidden="true">*</span></label>
      <select id="slotId" name="slotId" required>
        <option value="" disabled${values.slotId ? '' : ' selected'}>Select a slot</option>
        ${slotOptions
            .map((s) => {
            const selected = String(s.id) === values.slotId ? ' selected' : '';
            const suffix = s.isCurrent ? ' (current)' : '';
            return `<option value="${s.id}"${selected}>${(0, html_1.escapeHtml)(s.label)}${(0, html_1.escapeHtml)(suffix)}</option>`;
        })
            .join('')}
      </select>
    `;
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

      <label for="therapyId">Therapy <span aria-hidden="true">*</span></label>
      <select id="therapyId" name="therapyId" required>
        <option value="" disabled${values.therapyId ? '' : ' selected'}>Select a therapy</option>
        ${therapySelectOptions}
      </select>

      ${slotField}

      <button type="submit"${noSlotsAvailable ? ' disabled' : ''}>${mode === 'new' ? 'Create appointment' : 'Save changes'}</button>
      <a href="/dashboard" role="button" class="secondary">Cancel</a>
    </form>
  `;
}
