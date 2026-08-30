import type { Category, Therapy } from '../../store'
import type { QueryExecutor } from './types'

// Therapies are seeded, read-only reference data — this file has no
// create/update/delete, matching src/store.ts and requirements.md.

export interface TherapyRow {
  id: number
  name: string
  description: string
  categories: string[]
}

export function mapTherapy(row: TherapyRow): Therapy {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    categories: row.categories as Category[],
  }
}

const THERAPY_COLUMNS = 'id, name, description, categories'

export async function listTherapies(executor: QueryExecutor): Promise<Therapy[]> {
  const { rows } = await executor.query<TherapyRow>(
    `SELECT ${THERAPY_COLUMNS} FROM therapies ORDER BY id ASC`
  )
  return rows.map(mapTherapy)
}

export async function getTherapy(
  executor: QueryExecutor,
  id: number
): Promise<Therapy | undefined> {
  const { rows } = await executor.query<TherapyRow>(
    `SELECT ${THERAPY_COLUMNS} FROM therapies WHERE id = $1`,
    [id]
  )
  return rows[0] ? mapTherapy(rows[0]) : undefined
}
