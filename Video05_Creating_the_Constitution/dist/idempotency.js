"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIdempotentResponse = getIdempotentResponse;
exports.saveIdempotentResponse = saveIdempotentResponse;
exports.resetIdempotencyCache = resetIdempotencyCache;
// Keyed by `${route}:${Idempotency-Key}` so retries of a POST return the
// original result instead of creating a duplicate or racing a since-taken slot.
const responses = new Map();
function getIdempotentResponse(key) {
    return responses.get(key);
}
function saveIdempotentResponse(key, response) {
    responses.set(key, response);
}
/**
 * Test-only: clears every cached idempotent response. Never called by
 * request-handling code — request behavior (getIdempotentResponse /
 * saveIdempotentResponse) is unchanged. Exists so test files can start
 * each test with an empty cache instead of one a previous test's
 * Idempotency-Key requests may have populated.
 */
function resetIdempotencyCache() {
    responses.clear();
}
