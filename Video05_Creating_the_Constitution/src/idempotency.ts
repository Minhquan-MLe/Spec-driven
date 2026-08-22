interface CachedResponse {
  status: number
  body: unknown
}

// Keyed by `${route}:${Idempotency-Key}` so retries of a POST return the
// original result instead of creating a duplicate or racing a since-taken slot.
const responses = new Map<string, CachedResponse>()

export function getIdempotentResponse(key: string): CachedResponse | undefined {
  return responses.get(key)
}

export function saveIdempotentResponse(key: string, response: CachedResponse): void {
  responses.set(key, response)
}
