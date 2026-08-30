import type { Slot } from '../../store'
import type { QueryExecutor } from './types'

// Slots are seeded, read-only *identity* — only their `taken` flag ever
// changes, and only ever from inside an appointment transaction (see
// appointments.ts). No standalone update/create/delete is exposed here.

interface SlotRow {
  id: number
  time_slot: Date
  taken: boolean
}

function mapSlot(row: SlotRow): Slot {
  return {
    id: row.id,
    timeSlot: row.time_slot.toISOString(),
    taken: row.taken,
  }
}

const SLOT_COLUMNS = 'id, time_slot, taken'

export async function listAvailableSlots(executor: QueryExecutor): Promise<Slot[]> {
  const { rows } = await executor.query<SlotRow>(
    `SELECT ${SLOT_COLUMNS} FROM slots WHERE taken = false ORDER BY time_slot ASC`
  )
  return rows.map(mapSlot)
}

export async function getSlot(executor: QueryExecutor, id: number): Promise<Slot | undefined> {
  const { rows } = await executor.query<SlotRow>(`SELECT ${SLOT_COLUMNS} FROM slots WHERE id = $1`, [
    id,
  ])
  return rows[0] ? mapSlot(rows[0]) : undefined
}

/**
 * Same as getSlot, but takes a row lock (`FOR UPDATE`) so no other
 * transaction can read-then-change this slot's `taken` flag until the
 * caller's transaction commits or rolls back. Only meaningful when
 * `executor` is a PoolClient inside an active transaction (see
 * withTransaction in ../index.ts) — that's the only way appointments.ts
 * ever calls this.
 */
export async function getSlotForUpdate(
  executor: QueryExecutor,
  id: number
): Promise<Slot | undefined> {
  const { rows } = await executor.query<SlotRow>(
    `SELECT ${SLOT_COLUMNS} FROM slots WHERE id = $1 FOR UPDATE`,
    [id]
  )
  return rows[0] ? mapSlot(rows[0]) : undefined
}

export async function setSlotTaken(
  executor: QueryExecutor,
  id: number,
  taken: boolean
): Promise<void> {
  await executor.query('UPDATE slots SET taken = $1 WHERE id = $2', [taken, id])
}
