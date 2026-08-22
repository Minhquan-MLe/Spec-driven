"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slots = void 0;
const hono_1 = require("hono");
const store_1 = require("../store");
exports.slots = new hono_1.Hono();
exports.slots.get('/', (c) => c.json((0, store_1.listAvailableSlots)()));
