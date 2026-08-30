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
exports.ailmentsUi = void 0;
const hono_1 = require("hono");
const ailmentForm_1 = require("../components/ailmentForm");
const html_1 = require("../html");
const layout_1 = require("../layout");
const store_1 = require("../store");
const validation_1 = require("../validation");
// Server-rendered HTML pages for creating, editing, and deleting an
// Ailment — mounted at /ailments in src/app.ts. Separate from
// src/routes/ailments.ts (the /api/ailments JSON API), which this file
// does not touch. Like the JSON routes, everything here goes through
// src/store.ts — never src/db/repository/* directly.
exports.ailmentsUi = new hono_1.Hono();
function formString(value) {
    return typeof value === 'string' ? value : '';
}
function renderFormPage(mode, id, values, errorMessage) {
    const title = mode === 'new' ? 'AgentClinic — New Ailment' : 'AgentClinic — Edit Ailment';
    return (0, layout_1.layout)(title, (0, ailmentForm_1.ailmentForm)({ mode, id, values, errorMessage }));
}
function renderNotFound(message) {
    return (0, layout_1.layout)('AgentClinic — Not Found', `
      <h1>Not Found</h1>
      <p>${(0, html_1.escapeHtml)(message)}</p>
      <p><a href="/dashboard">Back to dashboard</a></p>
    `);
}
/**
 * Validates the four fields shared by create and edit. Returns an
 * error message (safe to show a user) if anything is invalid, or
 * undefined if the fields are all valid.
 */
function validateCoreFields(values) {
    if (!(0, validation_1.isNonEmptyString)(values.agentId) ||
        !(0, validation_1.isNonEmptyString)(values.title) ||
        !(0, validation_1.isNonEmptyString)(values.description) ||
        !(0, validation_1.isNonEmptyString)(values.category)) {
        return 'Agent ID, category, title, and description are all required.';
    }
    if (!store_1.CATEGORIES.includes(values.category)) {
        return `Category must be one of: ${store_1.CATEGORIES.join(', ')}.`;
    }
    return undefined;
}
exports.ailmentsUi.get('/new', (c) => {
    return c.html(renderFormPage('new', undefined, { agentId: '', category: '', title: '', description: '' }));
});
exports.ailmentsUi.post('/new', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const body = yield c.req.parseBody();
    const values = {
        agentId: formString(body.agentId),
        category: formString(body.category),
        title: formString(body.title),
        description: formString(body.description),
    };
    const errorMessage = validateCoreFields(values);
    if (errorMessage) {
        return c.html(renderFormPage('new', undefined, values, errorMessage), 400);
    }
    yield (0, store_1.createAilment)({
        agentId: values.agentId,
        category: values.category,
        title: values.title,
        description: values.description,
    });
    return c.redirect('/dashboard', 303);
}));
exports.ailmentsUi.get('/:id/edit', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(c.req.param('id'));
    const ailment = yield (0, store_1.getAilment)(id);
    if (!ailment) {
        return c.html(renderNotFound('This ailment no longer exists.'), 404);
    }
    return c.html(renderFormPage('edit', ailment.id, {
        agentId: ailment.agentId,
        category: ailment.category,
        title: ailment.title,
        description: ailment.description,
        status: ailment.status,
    }));
}));
exports.ailmentsUi.post('/:id/edit', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(c.req.param('id'));
    const existing = yield (0, store_1.getAilment)(id);
    if (!existing) {
        return c.html(renderNotFound('This ailment no longer exists.'), 404);
    }
    const body = yield c.req.parseBody();
    const values = {
        agentId: formString(body.agentId),
        category: formString(body.category),
        title: formString(body.title),
        description: formString(body.description),
        status: formString(body.status),
    };
    let errorMessage = validateCoreFields(values);
    if (!errorMessage && values.status !== 'open' && values.status !== 'resolved') {
        errorMessage = "Status must be 'open' or 'resolved'.";
    }
    if (errorMessage) {
        return c.html(renderFormPage('edit', id, values, errorMessage), 400);
    }
    const updated = yield (0, store_1.updateAilment)(id, {
        agentId: values.agentId,
        category: values.category,
        title: values.title,
        description: values.description,
        status: values.status,
    });
    if (!updated) {
        // Rare race: deleted between the getAilment check above and here.
        return c.html(renderNotFound('This ailment no longer exists.'), 404);
    }
    return c.redirect('/dashboard', 303);
}));
exports.ailmentsUi.post('/:id/delete', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(c.req.param('id'));
    const deleted = yield (0, store_1.deleteAilment)(id);
    if (!deleted) {
        return c.html(renderNotFound('This ailment no longer exists.'), 404);
    }
    return c.redirect('/dashboard', 303);
}));
