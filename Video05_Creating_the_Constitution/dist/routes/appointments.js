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
exports.appointments = void 0;
const hono_1 = require("hono");
const store_1 = require("../store");
const idempotency_1 = require("../idempotency");
const validation_1 = require("../validation");
exports.appointments = new hono_1.Hono();
exports.appointments.post('/', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const idempotencyKey = c.req.header('Idempotency-Key');
    if (idempotencyKey) {
        const cached = (0, idempotency_1.getIdempotentResponse)(`appointments:${idempotencyKey}`);
        if (cached)
            return c.json(cached.body, cached.status);
    }
    const parsed = (0, validation_1.parseJsonBody)(yield c.req.text());
    if (!parsed.ok) {
        return c.json({ error: 'request body must be valid JSON' }, 400);
    }
    const { agentId, therapyId: rawTherapyId, slotId: rawSlotId } = parsed.body;
    const therapyId = (0, validation_1.parsePositiveInt)(rawTherapyId);
    const slotId = (0, validation_1.parsePositiveInt)(rawSlotId);
    if (!(0, validation_1.isNonEmptyString)(agentId) || therapyId === null || slotId === null) {
        return c.json({
            error: 'agentId (string), therapyId (positive integer), and slotId (positive integer) are required',
        }, 400);
    }
    const result = (0, store_1.createAppointment)({ agentId, therapyId, slotId });
    if (!result.ok) {
        if (result.reason === 'slot_taken') {
            return c.json({ error: 'slot already taken' }, 409);
        }
        return c.json({ error: result.reason.replace('_', ' ') }, 404);
    }
    if (idempotencyKey) {
        (0, idempotency_1.saveIdempotentResponse)(`appointments:${idempotencyKey}`, {
            status: 201,
            body: result.appointment,
        });
    }
    return c.json(result.appointment, 201);
}));
exports.appointments.get('/', (c) => c.json((0, store_1.listAppointments)()));
