"use strict";
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
exports.app.get('/dashboard', (c) => {
    const ailmentRows = (0, store_1.listAilments)()
        .map((a) => `<tr><td>${a.id}</td><td>${(0, html_1.escapeHtml)(a.category)}</td><td>${(0, html_1.escapeHtml)(a.title)}</td><td><mark>${(0, html_1.escapeHtml)(a.status)}</mark></td></tr>`)
        .join('');
    const therapyRows = (0, store_1.listTherapies)()
        .map((t) => `<tr><td>${(0, html_1.escapeHtml)(t.name)}</td><td>${(0, html_1.escapeHtml)(t.categories.join(', '))}</td></tr>`)
        .join('');
    const appointmentRows = (0, store_1.listAppointments)()
        .map((appt) => {
        var _a, _b;
        const therapy = (0, store_1.getTherapy)(appt.therapyId);
        const slot = (0, store_1.getSlot)(appt.slotId);
        return `<tr><td>${(0, html_1.escapeHtml)(appt.agentId)}</td><td>${(0, html_1.escapeHtml)((_a = therapy === null || therapy === void 0 ? void 0 : therapy.name) !== null && _a !== void 0 ? _a : 'Unknown')}</td><td>${(0, html_1.escapeHtml)((_b = slot === null || slot === void 0 ? void 0 : slot.timeSlot) !== null && _b !== void 0 ? _b : 'Unknown')}</td></tr>`;
    })
        .join('');
    const content = `
    <h1>Dashboard</h1>

    <section>
      <h2>Ailments</h2>
      <table>
        <thead><tr><th>ID</th><th>Category</th><th>Title</th><th>Status</th></tr></thead>
        <tbody>${ailmentRows || '<tr><td colspan="4">No ailments reported yet.</td></tr>'}</tbody>
      </table>
    </section>

    <section>
      <h2>Therapies</h2>
      <table>
        <thead><tr><th>Name</th><th>Categories</th></tr></thead>
        <tbody>${therapyRows}</tbody>
      </table>
    </section>

    <section>
      <h2>Appointments</h2>
      <table>
        <thead><tr><th>Agent</th><th>Therapy</th><th>Time</th></tr></thead>
        <tbody>${appointmentRows || '<tr><td colspan="3">No appointments booked yet.</td></tr>'}</tbody>
      </table>
    </section>
  `;
    return c.html((0, layout_1.layout)('AgentClinic — Dashboard', content));
});
