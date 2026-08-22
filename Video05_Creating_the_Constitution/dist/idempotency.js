"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIdempotentResponse = getIdempotentResponse;
exports.saveIdempotentResponse = saveIdempotentResponse;
// Keyed by `${route}:${Idempotency-Key}` so retries of a POST return the
// original result instead of creating a duplicate or racing a since-taken slot.
const responses = new Map();
function getIdempotentResponse(key) {
    return responses.get(key);
}
function saveIdempotentResponse(key, response) {
    responses.set(key, response);
}
