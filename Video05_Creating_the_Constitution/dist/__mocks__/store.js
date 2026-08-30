"use strict";
// Manual Vitest mock for '../store' / './store'. Activated only in test
// files that call `vi.mock('./store')` (or `vi.mock('../store')`) —
// never loaded by production code, which always imports the real
// ./store.ts (backed by PostgreSQL).
//
// This is a straight async port of what src/store.ts's in-memory
// implementation looked like before this phase — same seed data (5
// therapies, 8 slots, matching the real db:seed), same logic — so
// existing route/app tests exercise real HTTP request handling,
// validation, and idempotency without needing a live database.
//
// IMPORTANT: Vitest isolates modules *per file*, not per test. Every
// `it()` in a file shares this same module state unless something
// resets it. Call resetMockStore() (below) in a `beforeEach` in every
// test file that mocks ../store, so one test can never observe data,
// booked slots, or id numbering left behind by another.
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
exports.CATEGORIES = void 0;
exports.resetMockStore = resetMockStore;
exports.createAilment = createAilment;
exports.listAilments = listAilments;
exports.getAilment = getAilment;
exports.updateAilment = updateAilment;
exports.deleteAilment = deleteAilment;
exports.listTherapies = listTherapies;
exports.getTherapy = getTherapy;
exports.therapiesForAilment = therapiesForAilment;
exports.listAvailableSlots = listAvailableSlots;
exports.getSlot = getSlot;
exports.createAppointment = createAppointment;
exports.listAppointments = listAppointments;
exports.getAppointment = getAppointment;
exports.updateAppointment = updateAppointment;
exports.deleteAppointment = deleteAppointment;
exports.CATEGORIES = [
    'performance',
    'reliability',
    'integration',
    'auth',
    'other',
];
const ailments = [];
const therapies = [];
const slots = [];
const appointments = [];
const SEED_THERAPIES = [
    {
        name: 'Timeout Tuning Session',
        description: 'Diagnose and adjust retry/backoff settings for slow-running tasks.',
        categories: ['performance'],
    },
    {
        name: 'Failover Rehearsal',
        description: 'Practice graceful degradation and failover paths.',
        categories: ['reliability'],
    },
    {
        name: 'API Contract Alignment',
        description: 'Resolve mismatched request/response shapes between services.',
        categories: ['integration'],
    },
    {
        name: 'Credential Refresh Clinic',
        description: 'Fix expired tokens and misconfigured auth scopes.',
        categories: ['auth'],
    },
    {
        name: 'General Checkup',
        description: "A catch-all consultation for anything that doesn't fit elsewhere.",
        categories: ['other'],
    },
];
// Matches the real db:seed script exactly (5 therapies, 8 future
// slots) — this mock's row counts are not a place to paper over
// cross-test slot contention; resetMockStore() below is.
const SLOT_COUNT = 8;
function reseedTherapiesAndSlots() {
    therapies.length = 0;
    for (const t of SEED_THERAPIES) {
        therapies.push(Object.assign({ id: therapies.length + 1 }, t));
    }
    slots.length = 0;
    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();
    for (let i = 1; i <= SLOT_COUNT; i++) {
        slots.push({
            id: slots.length + 1,
            timeSlot: new Date(now + i * day).toISOString(),
            taken: false,
        });
    }
}
reseedTherapiesAndSlots();
/**
 * Test-only: restores this mock to its exact initial state.
 *   - ailments and appointments are emptied — since both modules'
 *     "next id" is just `array.length + 1`, this also resets id
 *     numbering back to starting at 1, with no separate counter to
 *     track.
 *   - therapies and slots are cleared and re-seeded from scratch (5
 *     therapies, 8 slots, all `taken: false`), even though nothing
 *     currently mutates therapies — defensive, so this stays correct
 *     if that ever changes.
 * Call this in a `beforeEach` in every test file that mocks ../store,
 * so no test can observe state (booked slots, created records, id
 * numbering) left behind by another.
 */
function resetMockStore() {
    ailments.length = 0;
    appointments.length = 0;
    reseedTherapiesAndSlots();
}
function createAilment(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const ailment = {
            id: ailments.length + 1,
            agentId: input.agentId,
            category: input.category,
            title: input.title,
            description: input.description,
            status: 'open',
            createdAt: new Date().toISOString(),
        };
        ailments.push(ailment);
        return ailment;
    });
}
function listAilments() {
    return __awaiter(this, void 0, void 0, function* () {
        return [...ailments].reverse();
    });
}
function getAilment(id) {
    return __awaiter(this, void 0, void 0, function* () {
        return ailments.find((a) => a.id === id);
    });
}
function updateAilment(id, patch) {
    return __awaiter(this, void 0, void 0, function* () {
        const ailment = ailments.find((a) => a.id === id);
        if (!ailment)
            return undefined;
        if (patch.agentId !== undefined)
            ailment.agentId = patch.agentId;
        if (patch.category !== undefined)
            ailment.category = patch.category;
        if (patch.title !== undefined)
            ailment.title = patch.title;
        if (patch.description !== undefined)
            ailment.description = patch.description;
        if (patch.status !== undefined)
            ailment.status = patch.status;
        return ailment;
    });
}
function deleteAilment(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const index = ailments.findIndex((a) => a.id === id);
        if (index === -1)
            return false;
        ailments.splice(index, 1);
        return true;
    });
}
function listTherapies() {
    return __awaiter(this, void 0, void 0, function* () {
        return therapies;
    });
}
function getTherapy(id) {
    return __awaiter(this, void 0, void 0, function* () {
        return therapies.find((t) => t.id === id);
    });
}
function therapiesForAilment(ailmentId) {
    return __awaiter(this, void 0, void 0, function* () {
        const ailment = yield getAilment(ailmentId);
        if (!ailment)
            return undefined;
        return therapies.filter((t) => t.categories.includes(ailment.category));
    });
}
function listAvailableSlots() {
    return __awaiter(this, void 0, void 0, function* () {
        return slots.filter((s) => !s.taken);
    });
}
function getSlot(id) {
    return __awaiter(this, void 0, void 0, function* () {
        return slots.find((s) => s.id === id);
    });
}
function createAppointment(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const therapy = yield getTherapy(input.therapyId);
        if (!therapy)
            return { ok: false, reason: 'therapy_not_found' };
        const slot = yield getSlot(input.slotId);
        if (!slot)
            return { ok: false, reason: 'slot_not_found' };
        if (slot.taken)
            return { ok: false, reason: 'slot_taken' };
        slot.taken = true;
        const appointment = {
            id: appointments.length + 1,
            agentId: input.agentId,
            therapyId: input.therapyId,
            slotId: input.slotId,
            createdAt: new Date().toISOString(),
        };
        appointments.push(appointment);
        return { ok: true, appointment };
    });
}
function listAppointments() {
    return __awaiter(this, void 0, void 0, function* () {
        return [...appointments].reverse();
    });
}
function getAppointment(id) {
    return __awaiter(this, void 0, void 0, function* () {
        return appointments.find((a) => a.id === id);
    });
}
function updateAppointment(id, patch) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const appointment = appointments.find((a) => a.id === id);
        if (!appointment)
            return { ok: false, reason: 'appointment_not_found' };
        if (patch.therapyId !== undefined) {
            const therapy = yield getTherapy(patch.therapyId);
            if (!therapy)
                return { ok: false, reason: 'therapy_not_found' };
        }
        const nextSlotId = (_a = patch.slotId) !== null && _a !== void 0 ? _a : appointment.slotId;
        const slotIsChanging = nextSlotId !== appointment.slotId;
        if (slotIsChanging) {
            const newSlot = slots.find((s) => s.id === nextSlotId);
            if (!newSlot)
                return { ok: false, reason: 'slot_not_found' };
            if (newSlot.taken)
                return { ok: false, reason: 'slot_taken' };
            const oldSlot = slots.find((s) => s.id === appointment.slotId);
            if (oldSlot)
                oldSlot.taken = false;
            newSlot.taken = true;
            appointment.slotId = nextSlotId;
        }
        if (patch.agentId !== undefined)
            appointment.agentId = patch.agentId;
        if (patch.therapyId !== undefined)
            appointment.therapyId = patch.therapyId;
        return { ok: true, appointment };
    });
}
function deleteAppointment(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const index = appointments.findIndex((a) => a.id === id);
        if (index === -1)
            return { ok: false, reason: 'appointment_not_found' };
        const [deleted] = appointments.splice(index, 1);
        const slot = slots.find((s) => s.id === deleted.slotId);
        if (slot)
            slot.taken = false;
        return { ok: true, appointment: deleted };
    });
}
