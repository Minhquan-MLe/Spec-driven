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
exports.appointments = new hono_1.Hono();
exports.appointments.post('/', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const body = yield c.req.json().catch(() => null);
    const agentId = body === null || body === void 0 ? void 0 : body.agentId;
    const therapyId = body === null || body === void 0 ? void 0 : body.therapyId;
    const slotId = body === null || body === void 0 ? void 0 : body.slotId;
    if (!agentId || therapyId == null || slotId == null) {
        return c.json({ error: 'agentId, therapyId, and slotId are required' }, 400);
    }
    const result = (0, store_1.createAppointment)({
        agentId,
        therapyId: Number(therapyId),
        slotId: Number(slotId),
    });
    if (!result.ok) {
        if (result.reason === 'slot_taken') {
            return c.json({ error: 'slot already taken' }, 409);
        }
        return c.json({ error: result.reason.replace('_', ' ') }, 400);
    }
    return c.json(result.appointment, 201);
}));
exports.appointments.get('/', (c) => c.json((0, store_1.listAppointments)()));
