"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.therapies = void 0;
const hono_1 = require("hono");
const store_1 = require("../store");
exports.therapies = new hono_1.Hono();
exports.therapies.get('/', (c) => c.json((0, store_1.listTherapies)()));
