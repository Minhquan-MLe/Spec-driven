import { describe, expect, it } from 'vitest'
import { formatSlotLabel } from './dateFormat'

describe('formatSlotLabel', () => {
  it('formats a valid ISO timestamp as "YYYY-MM-DD HH:MM UTC"', () => {
    expect(formatSlotLabel('2026-09-02T00:00:00.000Z')).toBe('2026-09-02 00:00 UTC')
  })

  it('formats a timestamp with a non-zero time-of-day', () => {
    expect(formatSlotLabel('2026-09-02T14:37:00.000Z')).toBe('2026-09-02 14:37 UTC')
  })

  it('returns "Unknown" instead of throwing for an unparseable value', () => {
    expect(() => formatSlotLabel('not-a-date')).not.toThrow()
    expect(formatSlotLabel('not-a-date')).toBe('Unknown')
  })

  it('returns "Unknown" instead of throwing for an empty string', () => {
    expect(formatSlotLabel('')).toBe('Unknown')
  })
})
