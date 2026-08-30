import type { Pool } from 'pg'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { closePool } from '../index'
import {
  createAilment,
  deleteAilment,
  getAilment,
  listAilments,
  therapiesForAilment,
  updateAilment,
} from './ailments'
import { createTestPool, resetTestTables, seedTestFixtures } from './testSupport'

describe('ailments repository', () => {
  const pool: Pool = createTestPool()

  beforeEach(async () => {
    await resetTestTables(pool)
    await seedTestFixtures(pool)
  })

  afterAll(async () => {
    await closePool(pool)
  })

  it('creates an ailment and maps snake_case columns to camelCase fields', async () => {
    const ailment = await createAilment(pool, {
      agentId: 'agent-1',
      category: 'auth',
      title: 'Token expired mid-run',
      description: 'Auth token expired while processing a long job.',
    })

    expect(ailment).toEqual({
      id: expect.any(Number),
      agentId: 'agent-1',
      category: 'auth',
      title: 'Token expired mid-run',
      description: 'Auth token expired while processing a long job.',
      status: 'open',
      createdAt: expect.any(String),
    })
    expect(new Date(ailment.createdAt).toISOString()).toBe(ailment.createdAt)
  })

  it('lists ailments newest first', async () => {
    const first = await createAilment(pool, {
      agentId: 'agent-1',
      category: 'other',
      title: 'First',
      description: 'd',
    })
    const second = await createAilment(pool, {
      agentId: 'agent-2',
      category: 'other',
      title: 'Second',
      description: 'd',
    })

    const listed = await listAilments(pool)

    expect(listed.map((a) => a.id)).toEqual([second.id, first.id])
  })

  it('gets an ailment by id, and returns undefined for a missing one', async () => {
    const created = await createAilment(pool, {
      agentId: 'agent-1',
      category: 'performance',
      title: 'Slow',
      description: 'd',
    })

    await expect(getAilment(pool, created.id)).resolves.toEqual(created)
    await expect(getAilment(pool, 999_999)).resolves.toBeUndefined()
  })

  it('updates only the given fields and returns the full updated row', async () => {
    const created = await createAilment(pool, {
      agentId: 'agent-1',
      category: 'performance',
      title: 'Slow',
      description: 'd',
    })

    const updated = await updateAilment(pool, created.id, { status: 'resolved' })

    expect(updated).toEqual({ ...created, status: 'resolved' })
  })

  it('returns undefined when updating a missing ailment', async () => {
    const result = await updateAilment(pool, 999_999, { status: 'resolved' })
    expect(result).toBeUndefined()
  })

  it('deletes an ailment and reports success/failure correctly', async () => {
    const created = await createAilment(pool, {
      agentId: 'agent-1',
      category: 'performance',
      title: 'Slow',
      description: 'd',
    })

    await expect(deleteAilment(pool, created.id)).resolves.toBe(true)
    await expect(getAilment(pool, created.id)).resolves.toBeUndefined()
    await expect(deleteAilment(pool, created.id)).resolves.toBe(false)
  })

  it('finds therapies matching an ailment’s category', async () => {
    const created = await createAilment(pool, {
      agentId: 'agent-1',
      category: 'auth',
      title: 'Token expired',
      description: 'd',
    })

    const matches = await therapiesForAilment(pool, created.id)

    expect(matches).toBeDefined()
    expect(matches!.length).toBeGreaterThan(0)
    expect(matches!.every((t) => t.categories.includes('auth'))).toBe(true)
  })

  it('returns undefined from therapiesForAilment for a missing ailment', async () => {
    await expect(therapiesForAilment(pool, 999_999)).resolves.toBeUndefined()
  })
})
