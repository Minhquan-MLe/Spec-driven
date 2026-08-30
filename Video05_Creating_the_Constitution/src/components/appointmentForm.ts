import { escapeHtml } from '../html'

// Reusable HTML for both the "new appointment" and "edit appointment"
// pages (src/routes/appointmentsUi.ts). Renders only the form fragment;
// callers wrap it with layout() and are responsible for resolving
// therapy/slot ids into the display options passed in here — this
// component never queries the store itself.

export interface AppointmentTherapyOption {
  id: number
  name: string
}

export interface AppointmentSlotOption {
  id: number
  label: string
  /** True for the appointment's own (currently taken) slot in edit mode. */
  isCurrent?: boolean
}

export interface AppointmentFormValues {
  agentId: string
  therapyId: string
  slotId: string
}

export interface AppointmentFormOptions {
  mode: 'new' | 'edit'
  id?: number
  values: AppointmentFormValues
  therapyOptions: AppointmentTherapyOption[]
  slotOptions: AppointmentSlotOption[]
  errorMessage?: string
}

export function appointmentForm(options: AppointmentFormOptions): string {
  const { mode, id, values, therapyOptions, slotOptions, errorMessage } = options
  const actionPath = mode === 'new' ? '/appointments/new' : `/appointments/${id}/edit`
  const heading = mode === 'new' ? 'New Appointment' : 'Edit Appointment'

  const therapySelectOptions = therapyOptions
    .map((t) => {
      const selected = String(t.id) === values.therapyId ? ' selected' : ''
      return `<option value="${t.id}"${selected}>${escapeHtml(t.name)}</option>`
    })
    .join('')

  const errorBlock = errorMessage
    ? `<p class="form-error" role="alert">${escapeHtml(errorMessage)}</p>`
    : ''

  // Only "new" can ever have zero slot options — "edit" always has at
  // least the appointment's own current slot (see buildSlotOptions in
  // the route module).
  const noSlotsAvailable = mode === 'new' && slotOptions.length === 0

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
            const selected = String(s.id) === values.slotId ? ' selected' : ''
            const suffix = s.isCurrent ? ' (current)' : ''
            return `<option value="${s.id}"${selected}>${escapeHtml(s.label)}${escapeHtml(suffix)}</option>`
          })
          .join('')}
      </select>
    `

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

      <label for="therapyId">Therapy <span aria-hidden="true">*</span></label>
      <select id="therapyId" name="therapyId" required>
        <option value="" disabled${values.therapyId ? '' : ' selected'}>Select a therapy</option>
        ${therapySelectOptions}
      </select>

      ${slotField}

      <button type="submit"${noSlotsAvailable ? ' disabled' : ''}>${mode === 'new' ? 'Create appointment' : 'Save changes'}</button>
      <a href="/dashboard" role="button" class="secondary">Cancel</a>
    </form>
  `
}
