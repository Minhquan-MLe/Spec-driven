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
exports.listAvailableSlots = listAvailableSlots;
exports.getSlot = getSlot;
exports.getSlotForUpdate = getSlotForUpdate;
exports.setSlotTaken = setSlotTaken;
function mapSlot(row) {
    return {
        id: row.id,
        timeSlot: row.time_slot.toISOString(),
        taken: row.taken,
    };
}
const SLOT_COLUMNS = 'id, time_slot, taken';
function listAvailableSlots(executor) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows } = yield executor.query(`SELECT ${SLOT_COLUMNS} FROM slots WHERE taken = false ORDER BY time_slot ASC`);
        return rows.map(mapSlot);
    });
}
function getSlot(executor, id) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows } = yield executor.query(`SELECT ${SLOT_COLUMNS} FROM slots WHERE id = $1`, [
            id,
        ]);
        return rows[0] ? mapSlot(rows[0]) : undefined;
    });
}
/**
 * Same as getSlot, but takes a row lock (`FOR UPDATE`) so no other
 * transaction can read-then-change this slot's `taken` flag until the
 * caller's transaction commits or rolls back. Only meaningful when
 * `executor` is a PoolClient inside an active transaction (see
 * withTransaction in ../index.ts) — that's the only way appointments.ts
 * ever calls this.
 */
function getSlotForUpdate(executor, id) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows } = yield executor.query(`SELECT ${SLOT_COLUMNS} FROM slots WHERE id = $1 FOR UPDATE`, [id]);
        return rows[0] ? mapSlot(rows[0]) : undefined;
    });
}
function setSlotTaken(executor, id, taken) {
    return __awaiter(this, void 0, void 0, function* () {
        yield executor.query('UPDATE slots SET taken = $1 WHERE id = $2', [taken, id]);
    });
}
