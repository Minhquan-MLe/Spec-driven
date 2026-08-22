export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function parsePositiveInt(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

export type ParsedBody =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false }

/**
 * Parses a raw request body as JSON, treating an empty body as `{}` (so
 * callers see a normal "missing field" error) while distinguishing it from
 * genuinely malformed JSON (which gets its own error).
 */
export function parseJsonBody(raw: string): ParsedBody {
  if (!raw.trim()) return { ok: true, body: {} }
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ok: true, body: {} }
    }
    return { ok: true, body: parsed as Record<string, unknown> }
  } catch {
    return { ok: false }
  }
}
