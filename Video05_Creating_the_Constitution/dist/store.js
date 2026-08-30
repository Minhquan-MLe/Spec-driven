"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const db_1 = require("./db");
const ailmentsRepo = __importStar(require("./db/repository/ailments"));
const appointmentsRepo = __importStar(require("./db/repository/appointments"));
const slotsRepo = __importStar(require("./db/repository/slots"));
const therapiesRepo = __importStar(require("./db/repository/therapies"));
// This module is the application's data-access surface — routes and
// app.ts import domain types and data functions from here, same as
// before. What changed is what's *behind* it: every function now
// delegates to the PostgreSQL repository (src/db/repository/) via the
// shared connection pool (getPool(), src/db/index.ts) instead of
// reading/writing in-memory arrays. There is no in-memory fallback if
// Postgres is unavailable — a failed query simply rejects, and Hono's
// error handler (see app.ts) turns that into a controlled 500 response.
exports.CATEGORIES = [
    'performance',
    'reliability',
    'integration',
    'auth',
    'other',
];
function createAilment(input) {
    return __awaiter(this, void 0, void 0, function* () {
        return ailmentsRepo.createAilment((0, db_1.getPool)(), input);
    });
}
function listAilments() {
    return __awaiter(this, void 0, void 0, function* () {
        return ailmentsRepo.listAilments((0, db_1.getPool)());
    });
}
/**
 * Route params arrive as `Number(c.req.param('id'))`, which is `NaN`
 * for a non-numeric id (e.g. `/api/ailments/abc`). The old in-memory
 * `.find()` quietly returned undefined for that (NaN never matches any
 * real id) — a real SQL query would instead reject with a Postgres type
 * error, turning a clean 404 into a 500. Guarding here preserves the
 * original graceful-404 behavior without special-casing it in the
 * route.
 */
function getAilment(id) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!Number.isInteger(id))
            return undefined;
        return ailmentsRepo.getAilment((0, db_1.getPool)(), id);
    });
}
function listTherapies() {
    return __awaiter(this, void 0, void 0, function* () {
        return therapiesRepo.listTherapies((0, db_1.getPool)());
    });
}
function getTherapy(id) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!Number.isInteger(id))
            return undefined;
        return therapiesRepo.getTherapy((0, db_1.getPool)(), id);
    });
}
function therapiesForAilment(ailmentId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!Number.isInteger(ailmentId))
            return undefined;
        return ailmentsRepo.therapiesForAilment((0, db_1.getPool)(), ailmentId);
    });
}
function listAvailableSlots() {
    return __awaiter(this, void 0, void 0, function* () {
        return slotsRepo.listAvailableSlots((0, db_1.getPool)());
    });
}
function getSlot(id) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!Number.isInteger(id))
            return undefined;
        return slotsRepo.getSlot((0, db_1.getPool)(), id);
    });
}
function createAppointment(input) {
    return __awaiter(this, void 0, void 0, function* () {
        // The repository's result type also covers 'appointment_not_found'
        // (relevant to update/delete, not implemented yet) — createAppointment
        // itself never returns that reason, so this narrows back to the
        // public type this module has always exposed.
        return appointmentsRepo.createAppointment((0, db_1.getPool)(), input);
    });
}
function listAppointments() {
    return __awaiter(this, void 0, void 0, function* () {
        return appointmentsRepo.listAppointments((0, db_1.getPool)());
    });
}
