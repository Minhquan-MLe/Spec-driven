"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CATEGORIES = void 0;
exports.createAilment = createAilment;
exports.listAilments = listAilments;
exports.getAilment = getAilment;
exports.listTherapies = listTherapies;
exports.getTherapy = getTherapy;
exports.therapiesForAilment = therapiesForAilment;
exports.listAvailableSlots = listAvailableSlots;
exports.getSlot = getSlot;
exports.createAppointment = createAppointment;
exports.listAppointments = listAppointments;
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
function seed() {
    const seedTherapies = [
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
    for (const t of seedTherapies) {
        therapies.push(Object.assign({ id: therapies.length + 1 }, t));
    }
    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();
    for (let i = 1; i <= 8; i++) {
        slots.push({
            id: slots.length + 1,
            timeSlot: new Date(now + i * day).toISOString(),
            taken: false,
        });
    }
}
seed();
function createAilment(input) {
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
}
function listAilments() {
    return [...ailments].reverse();
}
function getAilment(id) {
    return ailments.find((a) => a.id === id);
}
function listTherapies() {
    return therapies;
}
function getTherapy(id) {
    return therapies.find((t) => t.id === id);
}
function therapiesForAilment(ailmentId) {
    const ailment = getAilment(ailmentId);
    if (!ailment)
        return undefined;
    return therapies.filter((t) => t.categories.includes(ailment.category));
}
function listAvailableSlots() {
    return slots.filter((s) => !s.taken);
}
function getSlot(id) {
    return slots.find((s) => s.id === id);
}
function createAppointment(input) {
    const therapy = getTherapy(input.therapyId);
    if (!therapy)
        return { ok: false, reason: 'therapy_not_found' };
    const slot = getSlot(input.slotId);
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
}
function listAppointments() {
    return [...appointments].reverse();
}
