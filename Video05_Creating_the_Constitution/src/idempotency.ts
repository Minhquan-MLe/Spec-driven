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

/**
 * Test-only: clears every cached idempotent response. Never called by
 * request-handling code — request behavior (getIdempotentResponse /
 * saveIdempotentResponse) is unchanged. Exists so test files can start
 * each test with an empty cache instead of one a previous test's
 * Idempotency-Key requests may have populated.
 */
export function resetIdempotencyCache(): void {
  responses.clear()
}
