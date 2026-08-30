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
exports.app = void 0;
const serve_static_1 = require("@hono/node-server/serve-static");
const hono_1 = require("hono");
const html_1 = require("./html");
const layout_1 = require("./layout");
const ailments_1 = require("./routes/ailments");
const therapies_1 = require("./routes/therapies");
const slots_1 = require("./routes/slots");
const appointments_1 = require("./routes/appointments");
const store_1 = require("./store");
exports.app = new hono_1.Hono();
// Postgres queries can fail (connection dropped, constraint violation,
// etc.); without this, Hono's default error handling could leak a raw
// error message — potentially including SQL or connection details —
// back to the client. This ensures every unhandled failure becomes a
// generic, controlled response instead. There is no in-memory fallback
// here: a database failure is a real failure, surfaced as a 500.
exports.app.onError((err, c) => {
    console.error(err);
    return c.json({ error: 'internal server error' }, 500);
});
exports.app.use('/*', (0, serve_static_1.serveStatic)({ root: './public' }));
exports.app.route('/api/ailments', ailments_1.ailments);
exports.app.route('/api/therapies', therapies_1.therapies);
exports.app.route('/api/slots', slots_1.slots);
exports.app.route('/api/appointments', appointments_1.appointments);
exports.app.get('/', (c) => {
    const content = `
    <h1>AgentClinic</h1>
    <p>A clinic for AI agents to report ailments, find therapies, and book
    appointments.</p>
    <p><a href="/dashboard">Go to dashboard</a></p>
  `;
    return c.html((0, layout_1.layout)('AgentClinic', content));
});
exports.app.get('/dashboard', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const [ailmentList, therapyList, appointmentList] = yield Promise.all([
        (0, store_1.listAilments)(),
        (0, store_1.listTherapies)(),
        (0, store_1.listAppointments)(),
    ]);
    const ailmentRows = ailmentList
        .map((a) => `<tr><td>${a.id}</td><td>${(0, html_1.escapeHtml)(a.category)}</td><td>${(0, html_1.escapeHtml)(a.title)}</td><td><mark>${(0, html_1.escapeHtml)(a.status)}</mark></td></tr>`)
        .join('');
    const therapyRows = therapyList
        .map((t) => `<tr><td>${(0, html_1.escapeHtml)(t.name)}</td><td>${(0, html_1.escapeHtml)(t.categories.join(', '))}</td></tr>`)
        .join('');
    const appointmentRows = (yield Promise.all(appointmentList.map((appt) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        const [therapy, slot] = yield Promise.all([
            (0, store_1.getTherapy)(appt.therapyId),
            (0, store_1.getSlot)(appt.slotId),
        ]);
        return `<tr><td>${(0, html_1.escapeHtml)(appt.agentId)}</td><td>${(0, html_1.escapeHtml)((_a = therapy === null || therapy === void 0 ? void 0 : therapy.name) !== null && _a !== void 0 ? _a : 'Unknown')}</td><td>${(0, html_1.escapeHtml)((_b = slot === null || slot === void 0 ? void 0 : slot.timeSlot) !== null && _b !== void 0 ? _b : 'Unknown')}</td></tr>`;
    })))).join('');
    const content = `
    <h1>Dashboard</h1>

    <section>
      <h2>Ailments</h2>
      <div class="table-responsive">
        <table>
          <thead><tr><th>ID</th><th>Category</th><th>Title</th><th>Status</th></tr></thead>
          <tbody>${ailmentRows || '<tr><td colspan="4">No ailments reported yet.</td></tr>'}</tbody>
        </table>
      </div>
    </section>

    <section>
      <h2>Therapies</h2>
      <div class="table-responsive">
        <table>
          <thead><tr><th>Name</th><th>Categories</th></tr></thead>
          <tbody>${therapyRows}</tbody>
        </table>
      </div>
    </section>

    <section>
      <h2>Appointments</h2>
      <div class="table-responsive">
        <table>
          <thead><tr><th>Agent</th><th>Therapy</th><th>Time</th></tr></thead>
          <tbody>${appointmentRows || '<tr><td colspan="3">No appointments booked yet.</td></tr>'}</tbody>
        </table>
      </div>
    </section>
  `;
    return c.html((0, layout_1.layout)('AgentClinic — Dashboard', content));
}));
