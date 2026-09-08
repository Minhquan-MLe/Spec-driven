// Shared date-display formatting. Used by both the appointment slot
// <select> (src/routes/appointmentsUi.ts) and the dashboard's Appointments
// table (src/app.ts) so there is exactly one implementation of "how a slot
// time is shown to a human."

/**
 * Deterministic, timezone-explicit "YYYY-MM-DD HH:MM UTC" label for a slot
 * time. Returns 'Unknown' instead of throwing if `timeSlot` isn't a valid
 * date — this is an exported/shared function, and a caller with an
 * unavailable slot (see app.ts's `slot?.timeSlot ?? 'Unknown'` pattern)
 * must never be able to crash the whole page over a formatting error.
 */
export function formatSlotLabel(timeSlot: string): string {
  const date = new Date(timeSlot)
  if (Number.isNaN(date.getTime())) return 'Unknown'

  const iso = date.toISOString()
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`
}
