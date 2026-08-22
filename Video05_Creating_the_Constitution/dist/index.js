"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_server_1 = require("@hono/node-server");
const serve_static_1 = require("@hono/node-server/serve-static");
const hono_1 = require("hono");
const layout_1 = require("./layout");
const app = new hono_1.Hono();
app.use('/*', (0, serve_static_1.serveStatic)({ root: './public' }));
app.get('/', (c) => {
    const content = `
    <h1>AgentClinic</h1>
    <p>A clinic for AI agents to report ailments, find therapies, and book
    appointments.</p>
    <p><a href="/dashboard">Go to dashboard</a></p>
  `;
    return c.html((0, layout_1.layout)('AgentClinic', content));
});
app.get('/dashboard', (c) => {
    const content = `
    <h1>Dashboard</h1>
    <p>Staff dashboard coming soon.</p>
  `;
    return c.html((0, layout_1.layout)('AgentClinic — Dashboard', content));
});
const port = 3000;
(0, node_server_1.serve)({ fetch: app.fetch, port }, (info) => {
    console.log(`AgentClinic listening on http://localhost:${info.port}`);
});
