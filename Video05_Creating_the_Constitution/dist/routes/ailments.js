"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ailments = void 0;
const hono_1 = require("hono");
const store_1 = require("../store");
const idempotency_1 = require("../idempotency");
const validation_1 = require("../validation");
exports.ailments = new hono_1.Hono();
exports.ailments.post('/', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const idempotencyKey = c.req.header('Idempotency-Key');
    if (idempotencyKey) {
        const cached = (0, idempotency_1.getIdempotentResponse)(`ailments:${idempotencyKey}`);
        if (cached)
            return c.json(cached.body, cached.status);
    }
    const parsed = (0, validation_1.parseJsonBody)(yield c.req.text());
    if (!parsed.ok) {
        return c.json({ error: 'request body must be valid JSON' }, 400);
    }
    const { agentId, category, title, description } = parsed.body;
    if (!(0, validation_1.isNonEmptyString)(agentId) ||
        !(0, validation_1.isNonEmptyString)(category) ||
        !(0, validation_1.isNonEmptyString)(title) ||
        !(0, validation_1.isNonEmptyString)(description)) {
        return c.json({
            error: 'agentId, category, title, and description are required strings',
        }, 400);
    }
    if (!store_1.CATEGORIES.includes(category)) {
        return c.json({ error: `category must be one of: ${store_1.CATEGORIES.join(', ')}` }, 400);
    }
    const ailment = yield (0, store_1.createAilment)({
        agentId,
        category: category,
        title,
        description,
    });
    if (idempotencyKey) {
        (0, idempotency_1.saveIdempotentResponse)(`ailments:${idempotencyKey}`, {
            status: 201,
            body: ailment,
        });
    }
    return c.json(ailment, 201);
}));
exports.ailments.get('/', (c) => __awaiter(void 0, void 0, void 0, function* () { return c.json(yield (0, store_1.listAilments)()); }));
exports.ailments.get('/:id', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const ailment = yield (0, store_1.getAilment)(Number(c.req.param('id')));
    if (!ailment)
        return c.json({ error: 'ailment not found' }, 404);
    return c.json(ailment);
}));
exports.ailments.get('/:id/therapies', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const therapies = yield (0, store_1.therapiesForAilment)(Number(c.req.param('id')));
    if (!therapies)
        return c.json({ error: 'ailment not found' }, 404);
    return c.json(therapies);
}));
exports.ailments.patch('/:id', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(c.req.param('id'));
    const parsed = (0, validation_1.parseJsonBody)(yield c.req.text());
    if (!parsed.ok) {
        return c.json({ error: 'request body must be valid JSON' }, 400);
    }
    const { agentId, category, title, description, status } = parsed.body;
    if (agentId === undefined &&
        category === undefined &&
        title === undefined &&
        description === undefined &&
        status === undefined) {
        return c.json({
            error: 'at least one of agentId, category, title, description, status is required',
        }, 400);
    }
    if (agentId !== undefined && !(0, validation_1.isNonEmptyString)(agentId)) {
        return c.json({ error: 'agentId must be a non-empty string' }, 400);
    }
    if (title !== undefined && !(0, validation_1.isNonEmptyString)(title)) {
        return c.json({ error: 'title must be a non-empty string' }, 400);
    }
    if (description !== undefined && !(0, validation_1.isNonEmptyString)(description)) {
        return c.json({ error: 'description must be a non-empty string' }, 400);
    }
    if (category !== undefined &&
        (!(0, validation_1.isNonEmptyString)(category) || !store_1.CATEGORIES.includes(category))) {
        return c.json({ error: `category must be one of: ${store_1.CATEGORIES.join(', ')}` }, 400);
    }
    if (status !== undefined && status !== 'open' && status !== 'resolved') {
        return c.json({ error: "status must be 'open' or 'resolved'" }, 400);
    }
    const updated = yield (0, store_1.updateAilment)(id, {
        agentId: agentId,
        category: category,
        title: title,
        description: description,
        status: status,
    });
    if (!updated)
        return c.json({ error: 'ailment not found' }, 404);
    return c.json(updated);
}));
exports.ailments.delete('/:id', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const deleted = yield (0, store_1.deleteAilment)(Number(c.req.param('id')));
    if (!deleted)
        return c.json({ error: 'ailment not found' }, 404);
    return c.body(null, 204);
}));
