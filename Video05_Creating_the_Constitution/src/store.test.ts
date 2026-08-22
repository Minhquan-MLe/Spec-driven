import { describe, expect, it } from 'vitest'
import {
  createAilment,
  createAppointment,
  listAvailableSlots,
  therapiesForAilment,
} from './store'

describe('therapiesForAilment', () => {
  it('returns therapies matching the ailment category', () => {
    const ailment = createAilment({
      agentId: 'agent-1',
      category: 'auth',
      title: 'Token expired mid-run',
      description: 'Auth token expired while processing a long job.',
    })

    const matches = therapiesForAilment(ailment.id)

    expect(matches).toBeDefined()
    expect(matches!.length).toBeGreaterThan(0)
    expect(matches!.every((t) => t.categories.includes('auth'))).toBe(true)
  })

  it('returns undefined for an unknown ailment id', () => {
    expect(therapiesForAilment(999_999)).toBeUndefined()
  })
})

describe('createAppointment', () => {
  it('rejects booking a slot that is already taken', () => {
    const [slot] = listAvailableSlots()
    const first = createAppointment({
      agentId: 'agent-1',
      therapyId: 1,
      slotId: slot.id,
    })
    expect(first.ok).toBe(true)

    const second = createAppointment({
      agentId: 'agent-2',
      therapyId: 1,
      slotId: slot.id,
    })
    expect(second).toEqual({ ok: false, reason: 'slot_taken' })
  })

  it('rejects an unknown slot id', () => {
    const result = createAppointment({
      agentId: 'agent-1',
      therapyId: 1,
      slotId: 999_999,
    })
    expect(result).toEqual({ ok: false, reason: 'slot_not_found' })
  })

  it('rejects an unknown therapy id', () => {
    const [slot] = listAvailableSlots()
    const result = createAppointment({
      agentId: 'agent-1',
      therapyId: 999_999,
      slotId: slot.id,
    })
    expect(result).toEqual({ ok: false, reason: 'therapy_not_found' })
  })
})
