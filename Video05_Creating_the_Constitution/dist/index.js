"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_server_1 = require("@hono/node-server");
const app_1 = require("./app");
const port = 3000;
(0, node_server_1.serve)({ fetch: app_1.app.fetch, port }, (info) => {
    console.log(`AgentClinic listening on http://localhost:${info.port}`);
});
