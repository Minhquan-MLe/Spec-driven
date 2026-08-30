import type { Ailment, Category, Therapy } from '../../store'
import { mapTherapy, type TherapyRow } from './therapies'
import type { QueryExecutor } from './types'

interface AilmentRow {
  id: number
  agent_id: string
  category: Category
  title: string
  description: string
  status: 'open' | 'resolved'
  created_at: Date
}

function mapAilment(row: AilmentRow): Ailment {
  return {
    id: row.id,
    agentId: row.agent_id,
    category: row.category,
    title: row.title,
    description: row.description,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  }
}

const AILMENT_COLUMNS = 'id, agent_id, category, title, description, status, created_at'

export async function createAilment(
  executor: QueryExecutor,
  input: { agentId: string; category: Category; title: string; description: string }
): Promise<Ailment> {
  const { rows } = await executor.query<AilmentRow>(
    `INSERT INTO ailments (agent_id, category, title, description)
     VALUES ($1, $2, $3, $4)
     RETURNING ${AILMENT_COLUMNS}`,
    [input.agentId, input.category, input.title, input.description]
  )
  return mapAilment(rows[0])
}

export async function listAilments(executor: QueryExecutor): Promise<Ailment[]> {
  const { rows } = await executor.query<AilmentRow>(
    `SELECT ${AILMENT_COLUMNS} FROM ailments ORDER BY id DESC`
  )
  return rows.map(mapAilment)
}

export async function getAilment(
  executor: QueryExecutor,
  id: number
): Promise<Ailment | undefined> {
  const { rows } = await executor.query<AilmentRow>(
    `SELECT ${AILMENT_COLUMNS} FROM ailments WHERE id = $1`,
    [id]
  )
  return rows[0] ? mapAilment(rows[0]) : undefined
}

export interface AilmentPatch {
  agentId?: string
  category?: Category
  title?: string
  description?: string
  status?: 'open' | 'resolved'
}

/**
 * Partial update. Only columns present in `patch` are included in the
 * SQL — the column *names* are always one of the five hardcoded
 * literals below (never derived from user input), and every *value* is
 * still passed as a `$n` placeholder, never concatenated into the query
 * string. Returns undefined if the ailment doesn't exist, and returns
 * the unchanged current row (not an error) if `patch` is empty.
 */
export async function updateAilment(
  executor: QueryExecutor,
  id: number,
  patch: AilmentPatch
): Promise<Ailment | undefined> {
  const setClauses: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (patch.agentId !== undefined) {
    setClauses.push(`agent_id = $${paramIndex++}`)
    values.push(patch.agentId)
  }
  if (patch.category !== undefined) {
    setClauses.push(`category = $${paramIndex++}`)
    values.push(patch.category)
  }
  if (patch.title !== undefined) {
    setClauses.push(`title = $${paramIndex++}`)
    values.push(patch.title)
  }
  if (patch.description !== undefined) {
    setClauses.push(`description = $${paramIndex++}`)
    values.push(patch.description)
  }
  if (patch.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`)
    values.push(patch.status)
  }

  if (setClauses.length === 0) {
    return getAilment(executor, id)
  }

  values.push(id)
  const { rows } = await executor.query<AilmentRow>(
    `UPDATE ailments SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING ${AILMENT_COLUMNS}`,
    values
  )
  return rows[0] ? mapAilment(rows[0]) : undefined
}

/** Returns true if a row was deleted, false if no ailment had that id. */
export async function deleteAilment(executor: QueryExecutor, id: number): Promise<boolean> {
  const result = await executor.query('DELETE FROM ailments WHERE id = $1', [id])
  return (result.rowCount ?? 0) > 0
}

/**
 * Therapies whose categories include this ailment's category. Returns
 * undefined (not an empty array) if the ailment itself doesn't exist,
 * so callers can distinguish "no ailment" (404) from "ailment exists,
 * no matching therapies" (empty list).
 */
export async function therapiesForAilment(
  executor: QueryExecutor,
  ailmentId: number
): Promise<Therapy[] | undefined> {
  const ailment = await getAilment(executor, ailmentId)
  if (!ailment) return undefined

  const { rows } = await executor.query<TherapyRow>(
    'SELECT id, name, description, categories FROM therapies WHERE $1 = ANY(categories) ORDER BY id ASC',
    [ailment.category]
  )
  return rows.map(mapTherapy)
}
