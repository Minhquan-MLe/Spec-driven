import type { Pool } from 'pg'
import type { Appointment } from '../../store'
import { withTransaction } from '../index'
import { getTherapy } from './therapies'
import { getSlotForUpdate, setSlotTaken } from './slots'

interface AppointmentRow {
  id: number
  agent_id: string
  therapy_id: number
  slot_id: number
  created_at: Date
}

function mapAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    agentId: row.agent_id,
    therapyId: row.therapy_id,
    slotId: row.slot_id,
    createdAt: row.created_at.toISOString(),
  }
}

const APPOINTMENT_COLUMNS = 'id, agent_id, therapy_id, slot_id, created_at'

export type AppointmentFailureReason =
  | 'appointment_not_found'
  | 'therapy_not_found'
  | 'slot_not_found'
  | 'slot_taken'

export type AppointmentResult =
  | { ok: true; appointment: Appointment }
  | { ok: false; reason: AppointmentFailureReason }

export async function listAppointments(pool: Pool): Promise<Appointment[]> {
  const { rows } = await pool.query<AppointmentRow>(
    `SELECT ${APPOINTMENT_COLUMNS} FROM appointments ORDER BY id DESC`
  )
  return rows.map(mapAppointment)
}

export async function getAppointment(pool: Pool, id: number): Promise<Appointment | undefined> {
  const { rows } = await pool.query<AppointmentRow>(
    `SELECT ${APPOINTMENT_COLUMNS} FROM appointments WHERE id = $1`,
    [id]
  )
  return rows[0] ? mapAppointment(rows[0]) : undefined
}

/**
 * Books an appointment. All in one transaction:
 *   1. the therapy must exist,
 *   2. the slot is row-locked (`FOR UPDATE`) and must exist and not
 *      already be taken — locking it here is what stops two concurrent
 *      requests for the same slot from both passing this check,
 *   3. the appointment row is inserted and the slot is marked taken.
 * A `slot_taken`/`slot_not_found`/`therapy_not_found` result rolls the
 * (otherwise empty) transaction back with nothing written; any
 * unexpected error thrown inside also rolls back the insert + slot
 * update together, never one without the other.
 */
export async function createAppointment(
  pool: Pool,
  input: { agentId: string; therapyId: number; slotId: number }
): Promise<AppointmentResult> {
  return withTransaction(pool, async (client) => {
    const therapy = await getTherapy(client, input.therapyId)
    if (!therapy) return { ok: false, reason: 'therapy_not_found' }

    const slot = await getSlotForUpdate(client, input.slotId)
    if (!slot) return { ok: false, reason: 'slot_not_found' }
    if (slot.taken) return { ok: false, reason: 'slot_taken' }

    const { rows } = await client.query<AppointmentRow>(
      `INSERT INTO appointments (agent_id, therapy_id, slot_id)
       VALUES ($1, $2, $3)
       RETURNING ${APPOINTMENT_COLUMNS}`,
      [input.agentId, input.therapyId, input.slotId]
    )
    await setSlotTaken(client, input.slotId, true)

    return { ok: true, appointment: mapAppointment(rows[0]) }
  })
}

export interface AppointmentPatch {
  agentId?: string
  therapyId?: number
  slotId?: number
}

/**
 * Partial update. All in one transaction:
 *   1. the appointment is row-locked and must exist,
 *   2. a new `therapyId`, if given, must reference a real therapy,
 *   3. if `slotId` is given and differs from the current slot, BOTH the
 *      old and new slot rows are locked (in ascending id order, so two
 *      concurrent updates swapping the same two slots can never
 *      deadlock each other) — the new slot must exist and not already
 *      be taken, then the old slot is released and the new one
 *      reserved,
 *   4. if `slotId` equals the current slot (or is omitted), slot state
 *      is left untouched entirely — no release/reserve cycle runs.
 * Any failure result rolls back with no partial writes; the same is
 * true if anything inside throws.
 */
export async function updateAppointment(
  pool: Pool,
  id: number,
  patch: AppointmentPatch
): Promise<AppointmentResult> {
  return withTransaction(pool, async (client) => {
    const { rows: existingRows } = await client.query<AppointmentRow>(
      `SELECT ${APPOINTMENT_COLUMNS} FROM appointments WHERE id = $1 FOR UPDATE`,
      [id]
    )
    if (existingRows.length === 0) return { ok: false, reason: 'appointment_not_found' }
    const existing = mapAppointment(existingRows[0])

    if (patch.therapyId !== undefined) {
      const therapy = await getTherapy(client, patch.therapyId)
      if (!therapy) return { ok: false, reason: 'therapy_not_found' }
    }

    const nextSlotId = patch.slotId ?? existing.slotId
    const slotIsChanging = nextSlotId !== existing.slotId

    if (slotIsChanging) {
      // Lock both slot rows in a fixed (ascending id) order regardless
      // of which is "old" and which is "new", so two updates that swap
      // the same pair of slots in opposite directions can't deadlock.
      const idsToLock = [existing.slotId, nextSlotId].sort((a, b) => a - b)
      const lockedById = new Map<number, Awaited<ReturnType<typeof getSlotForUpdate>>>()
      for (const slotId of idsToLock) {
        lockedById.set(slotId, await getSlotForUpdate(client, slotId))
      }

      const newSlot = lockedById.get(nextSlotId)
      if (!newSlot) return { ok: false, reason: 'slot_not_found' }
      if (newSlot.taken) return { ok: false, reason: 'slot_taken' }

      await setSlotTaken(client, existing.slotId, false)
      await setSlotTaken(client, nextSlotId, true)
    }

    const setClauses: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (patch.agentId !== undefined) {
      setClauses.push(`agent_id = $${paramIndex++}`)
      values.push(patch.agentId)
    }
    if (patch.therapyId !== undefined) {
      setClauses.push(`therapy_id = $${paramIndex++}`)
      values.push(patch.therapyId)
    }
    if (slotIsChanging) {
      setClauses.push(`slot_id = $${paramIndex++}`)
      values.push(nextSlotId)
    }

    if (setClauses.length === 0) {
      return { ok: true, appointment: existing }
    }

    values.push(id)
    const { rows } = await client.query<AppointmentRow>(
      `UPDATE appointments SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING ${APPOINTMENT_COLUMNS}`,
      values
    )
    return { ok: true, appointment: mapAppointment(rows[0]) }
  })
}

export type DeleteAppointmentResult =
  | { ok: true; appointment: Appointment }
  | { ok: false; reason: 'appointment_not_found' }

/**
 * Deletes the appointment and releases its slot in one transaction —
 * `DELETE ... RETURNING` removes the row and hands back its data in a
 * single statement, then the slot is marked available in the same
 * transaction. If no row matched, nothing (including no slot change)
 * happens.
 */
export async function deleteAppointment(
  pool: Pool,
  id: number
): Promise<DeleteAppointmentResult> {
  return withTransaction(pool, async (client) => {
    const { rows } = await client.query<AppointmentRow>(
      `DELETE FROM appointments WHERE id = $1 RETURNING ${APPOINTMENT_COLUMNS}`,
      [id]
    )
    if (rows.length === 0) return { ok: false, reason: 'appointment_not_found' }

    const deleted = mapAppointment(rows[0])
    await setSlotTaken(client, deleted.slotId, false)
    return { ok: true, appointment: deleted }
  })
}
