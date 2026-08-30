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
exports.appointmentsUi = void 0;
const hono_1 = require("hono");
const appointmentForm_1 = require("../components/appointmentForm");
const html_1 = require("../html");
const layout_1 = require("../layout");
const store_1 = require("../store");
const validation_1 = require("../validation");
// Server-rendered HTML pages for creating, editing, and deleting an
// Appointment — mounted at /appointments in src/app.ts. Separate from
// src/routes/appointments.ts (the /api/appointments JSON API), which
// this file does not touch. Like the JSON routes, everything here goes
// through src/store.ts — never src/db/repository/* directly. Mirrors
// src/routes/ailmentsUi.ts's structure.
exports.appointmentsUi = new hono_1.Hono();
function formString(value) {
    return typeof value === 'string' ? value : '';
}
/** Deterministic, timezone-explicit "YYYY-MM-DD HH:MM UTC" label. */
function formatSlotLabel(timeSlot) {
    const iso = new Date(timeSlot).toISOString();
    return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}
function renderNotFound(message) {
    return (0, layout_1.layout)('AgentClinic — Not Found', `
      <h1>Not Found</h1>
      <p>${(0, html_1.escapeHtml)(message)}</p>
      <p><a href="/dashboard">Back to dashboard</a></p>
    `);
}
function buildTherapyOptions() {
    return __awaiter(this, void 0, void 0, function* () {
        const therapies = yield (0, store_1.listTherapies)();
        return therapies.map((t) => ({ id: t.id, name: t.name }));
    });
}
/**
 * Every currently available slot, plus — when editing — the
 * appointment's own current slot, which is `taken` (by this
 * appointment) and so wouldn't otherwise appear. The current slot is
 * marked `isCurrent` and never duplicated if it's somehow already in
 * the available list.
 */
function buildSlotOptions(currentSlotId) {
    return __awaiter(this, void 0, void 0, function* () {
        const available = yield (0, store_1.listAvailableSlots)();
        const options = available.map((s) => ({
            id: s.id,
            label: formatSlotLabel(s.timeSlot),
        }));
        if (currentSlotId !== undefined && !options.some((o) => o.id === currentSlotId)) {
            const currentSlot = yield (0, store_1.getSlot)(currentSlotId);
            if (currentSlot) {
                options.push({ id: currentSlot.id, label: formatSlotLabel(currentSlot.timeSlot), isCurrent: true });
            }
        }
        return options.sort((a, b) => a.id - b.id);
    });
}
function renderFormPage(mode, id, values, therapyOptions, slotOptions, errorMessage) {
    const title = mode === 'new' ? 'AgentClinic — New Appointment' : 'AgentClinic — Edit Appointment';
    return (0, layout_1.layout)(title, (0, appointmentForm_1.appointmentForm)({ mode, id, values, therapyOptions, slotOptions, errorMessage }));
}
function messageForReason(reason) {
    switch (reason) {
        case 'slot_taken':
            return 'That slot was just taken by someone else. Please choose another.';
        case 'therapy_not_found':
            return 'Selected therapy no longer exists.';
        case 'slot_not_found':
            return 'Selected slot no longer exists.';
    }
}
exports.appointmentsUi.get('/new', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const [therapyOptions, slotOptions] = yield Promise.all([buildTherapyOptions(), buildSlotOptions()]);
    return c.html(renderFormPage('new', undefined, { agentId: '', therapyId: '', slotId: '' }, therapyOptions, slotOptions));
}));
exports.appointmentsUi.post('/new', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const body = yield c.req.parseBody();
    const values = {
        agentId: formString(body.agentId),
        therapyId: formString(body.therapyId),
        slotId: formString(body.slotId),
    };
    const therapyId = (0, validation_1.parsePositiveInt)(values.therapyId);
    const slotId = (0, validation_1.parsePositiveInt)(values.slotId);
    if (!(0, validation_1.isNonEmptyString)(values.agentId) || therapyId === null || slotId === null) {
        const [therapyOptions, slotOptions] = yield Promise.all([buildTherapyOptions(), buildSlotOptions()]);
        return c.html(renderFormPage('new', undefined, values, therapyOptions, slotOptions, 'Agent ID, therapy, and slot are all required.'), 400);
    }
    const result = yield (0, store_1.createAppointment)({ agentId: values.agentId, therapyId, slotId });
    if (!result.ok) {
        const [therapyOptions, slotOptions] = yield Promise.all([buildTherapyOptions(), buildSlotOptions()]);
        const status = result.reason === 'slot_taken' ? 409 : 404;
        return c.html(renderFormPage('new', undefined, values, therapyOptions, slotOptions, messageForReason(result.reason)), status);
    }
    return c.redirect('/dashboard', 303);
}));
exports.appointmentsUi.get('/:id/edit', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(c.req.param('id'));
    const appointment = yield (0, store_1.getAppointment)(id);
    if (!appointment) {
        return c.html(renderNotFound('This appointment no longer exists.'), 404);
    }
    const [therapyOptions, slotOptions] = yield Promise.all([
        buildTherapyOptions(),
        buildSlotOptions(appointment.slotId),
    ]);
    return c.html(renderFormPage('edit', appointment.id, {
        agentId: appointment.agentId,
        therapyId: String(appointment.therapyId),
        slotId: String(appointment.slotId),
    }, therapyOptions, slotOptions));
}));
exports.appointmentsUi.post('/:id/edit', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(c.req.param('id'));
    const existing = yield (0, store_1.getAppointment)(id);
    if (!existing) {
        return c.html(renderNotFound('This appointment no longer exists.'), 404);
    }
    const body = yield c.req.parseBody();
    const values = {
        agentId: formString(body.agentId),
        therapyId: formString(body.therapyId),
        slotId: formString(body.slotId),
    };
    const therapyId = (0, validation_1.parsePositiveInt)(values.therapyId);
    const slotId = (0, validation_1.parsePositiveInt)(values.slotId);
    if (!(0, validation_1.isNonEmptyString)(values.agentId) || therapyId === null || slotId === null) {
        const [therapyOptions, slotOptions] = yield Promise.all([
            buildTherapyOptions(),
            buildSlotOptions(existing.slotId),
        ]);
        return c.html(renderFormPage('edit', id, values, therapyOptions, slotOptions, 'Agent ID, therapy, and slot are all required.'), 400);
    }
    const result = yield (0, store_1.updateAppointment)(id, { agentId: values.agentId, therapyId, slotId });
    if (!result.ok) {
        if (result.reason === 'appointment_not_found') {
            // Rare race: deleted between the getAppointment check above and here.
            return c.html(renderNotFound('This appointment no longer exists.'), 404);
        }
        const [therapyOptions, slotOptions] = yield Promise.all([
            buildTherapyOptions(),
            buildSlotOptions(existing.slotId),
        ]);
        const status = result.reason === 'slot_taken' ? 409 : 404;
        return c.html(renderFormPage('edit', id, values, therapyOptions, slotOptions, messageForReason(result.reason)), status);
    }
    return c.redirect('/dashboard', 303);
}));
exports.appointmentsUi.post('/:id/delete', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(c.req.param('id'));
    const result = yield (0, store_1.deleteAppointment)(id);
    if (!result.ok) {
        return c.html(renderNotFound('This appointment no longer exists.'), 404);
    }
    return c.redirect('/dashboard', 303);
}));
