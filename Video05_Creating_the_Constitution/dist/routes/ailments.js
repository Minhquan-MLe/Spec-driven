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
exports.ailments = void 0;
const hono_1 = require("hono");
const store_1 = require("../store");
exports.ailments = new hono_1.Hono();
exports.ailments.post('/', (c) => __awaiter(void 0, void 0, void 0, function* () {
    const body = yield c.req.json().catch(() => null);
    const agentId = body === null || body === void 0 ? void 0 : body.agentId;
    const category = body === null || body === void 0 ? void 0 : body.category;
    const title = body === null || body === void 0 ? void 0 : body.title;
    const description = body === null || body === void 0 ? void 0 : body.description;
    if (!agentId || !category || !title || !description) {
        return c.json({ error: 'agentId, category, title, and description are required' }, 400);
    }
    if (!store_1.CATEGORIES.includes(category)) {
        return c.json({ error: `category must be one of: ${store_1.CATEGORIES.join(', ')}` }, 400);
    }
    const ailment = (0, store_1.createAilment)({ agentId, category, title, description });
    return c.json(ailment, 201);
}));
exports.ailments.get('/', (c) => c.json((0, store_1.listAilments)()));
exports.ailments.get('/:id', (c) => {
    const ailment = (0, store_1.getAilment)(Number(c.req.param('id')));
    if (!ailment)
        return c.json({ error: 'ailment not found' }, 404);
    return c.json(ailment);
});
exports.ailments.get('/:id/therapies', (c) => {
    const therapies = (0, store_1.therapiesForAilment)(Number(c.req.param('id')));
    if (!therapies)
        return c.json({ error: 'ailment not found' }, 404);
    return c.json(therapies);
});
