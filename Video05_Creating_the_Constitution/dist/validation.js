"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNonEmptyString = isNonEmptyString;
exports.parsePositiveInt = parsePositiveInt;
exports.parseJsonBody = parseJsonBody;
function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}
function parsePositiveInt(value) {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
}
/**
 * Parses a raw request body as JSON, treating an empty body as `{}` (so
 * callers see a normal "missing field" error) while distinguishing it from
 * genuinely malformed JSON (which gets its own error).
 */
function parseJsonBody(raw) {
    if (!raw.trim())
        return { ok: true, body: {} };
    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return { ok: true, body: {} };
        }
        return { ok: true, body: parsed };
    }
    catch (_a) {
        return { ok: false };
    }
}
