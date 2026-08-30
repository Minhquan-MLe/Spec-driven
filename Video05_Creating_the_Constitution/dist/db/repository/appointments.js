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
exports.listAppointments = listAppointments;
exports.getAppointment = getAppointment;
exports.createAppointment = createAppointment;
exports.updateAppointment = updateAppointment;
exports.deleteAppointment = deleteAppointment;
const index_1 = require("../index");
const therapies_1 = require("./therapies");
const slots_1 = require("./slots");
function mapAppointment(row) {
    return {
        id: row.id,
        agentId: row.agent_id,
        therapyId: row.therapy_id,
        slotId: row.slot_id,
        createdAt: row.created_at.toISOString(),
    };
}
const APPOINTMENT_COLUMNS = 'id, agent_id, therapy_id, slot_id, created_at';
function listAppointments(pool) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows } = yield pool.query(`SELECT ${APPOINTMENT_COLUMNS} FROM appointments ORDER BY id DESC`);
        return rows.map(mapAppointment);
    });
}
function getAppointment(pool, id) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows } = yield pool.query(`SELECT ${APPOINTMENT_COLUMNS} FROM appointments WHERE id = $1`, [id]);
        return rows[0] ? mapAppointment(rows[0]) : undefined;
    });
}
/**
 * Books an appointment. All in one transaction:
 *   1. the therapy must exist,
 *   2. the slot is row-locked (`FOR UPDATE`) and must exist and not
 *      already be taken — locking it here is what stops two concurrent
 *      requests for the same slot from both passing this check,
 *   3. the appointment row is inserted and the slot is marked taken.
 * A `slot_taken`/`slot_not_found`/`therapy_not_found` result rolls the
 * (otherwise empty) transaction back with nothing written; any
 * unexpected error thrown inside also rolls back the insert + slot
 * update together, never one without the other.
 */
function createAppointment(pool, input) {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, index_1.withTransaction)(pool, (client) => __awaiter(this, void 0, void 0, function* () {
            const therapy = yield (0, therapies_1.getTherapy)(client, input.therapyId);
            if (!therapy)
                return { ok: false, reason: 'therapy_not_found' };
            const slot = yield (0, slots_1.getSlotForUpdate)(client, input.slotId);
            if (!slot)
                return { ok: false, reason: 'slot_not_found' };
            if (slot.taken)
                return { ok: false, reason: 'slot_taken' };
            const { rows } = yield client.query(`INSERT INTO appointments (agent_id, therapy_id, slot_id)
       VALUES ($1, $2, $3)
       RETURNING ${APPOINTMENT_COLUMNS}`, [input.agentId, input.therapyId, input.slotId]);
            yield (0, slots_1.setSlotTaken)(client, input.slotId, true);
            return { ok: true, appointment: mapAppointment(rows[0]) };
        }));
    });
}
/**
 * Partial update. All in one transaction:
 *   1. the appointment is row-locked and must exist,
 *   2. a new `therapyId`, if given, must reference a real therapy,
 *   3. if `slotId` is given and differs from the current slot, BOTH the
 *      old and new slot rows are locked (in ascending id order, so two
 *      concurrent updates swapping the same two slots can never
 *      deadlock each other) — the new slot must exist and not already
 *      be taken, then the old slot is released and the new one
 *      reserved,
 *   4. if `slotId` equals the current slot (or is omitted), slot state
 *      is left untouched entirely — no release/reserve cycle runs.
 * Any failure result rolls back with no partial writes; the same is
 * true if anything inside throws.
 */
function updateAppointment(pool, id, patch) {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, index_1.withTransaction)(pool, (client) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { rows: existingRows } = yield client.query(`SELECT ${APPOINTMENT_COLUMNS} FROM appointments WHERE id = $1 FOR UPDATE`, [id]);
            if (existingRows.length === 0)
                return { ok: false, reason: 'appointment_not_found' };
            const existing = mapAppointment(existingRows[0]);
            if (patch.therapyId !== undefined) {
                const therapy = yield (0, therapies_1.getTherapy)(client, patch.therapyId);
                if (!therapy)
                    return { ok: false, reason: 'therapy_not_found' };
            }
            const nextSlotId = (_a = patch.slotId) !== null && _a !== void 0 ? _a : existing.slotId;
            const slotIsChanging = nextSlotId !== existing.slotId;
            if (slotIsChanging) {
                // Lock both slot rows in a fixed (ascending id) order regardless
                // of which is "old" and which is "new", so two updates that swap
                // the same pair of slots in opposite directions can't deadlock.
                const idsToLock = [existing.slotId, nextSlotId].sort((a, b) => a - b);
                const lockedById = new Map();
                for (const slotId of idsToLock) {
                    lockedById.set(slotId, yield (0, slots_1.getSlotForUpdate)(client, slotId));
                }
                const newSlot = lockedById.get(nextSlotId);
                if (!newSlot)
                    return { ok: false, reason: 'slot_not_found' };
                if (newSlot.taken)
                    return { ok: false, reason: 'slot_taken' };
                yield (0, slots_1.setSlotTaken)(client, existing.slotId, false);
                yield (0, slots_1.setSlotTaken)(client, nextSlotId, true);
            }
            const setClauses = [];
            const values = [];
            let paramIndex = 1;
            if (patch.agentId !== undefined) {
                setClauses.push(`agent_id = $${paramIndex++}`);
                values.push(patch.agentId);
            }
            if (patch.therapyId !== undefined) {
                setClauses.push(`therapy_id = $${paramIndex++}`);
                values.push(patch.therapyId);
            }
            if (slotIsChanging) {
                setClauses.push(`slot_id = $${paramIndex++}`);
                values.push(nextSlotId);
            }
            if (setClauses.length === 0) {
                return { ok: true, appointment: existing };
            }
            values.push(id);
            const { rows } = yield client.query(`UPDATE appointments SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING ${APPOINTMENT_COLUMNS}`, values);
            return { ok: true, appointment: mapAppointment(rows[0]) };
        }));
    });
}
/**
 * Deletes the appointment and releases its slot in one transaction —
 * `DELETE ... RETURNING` removes the row and hands back its data in a
 * single statement, then the slot is marked available in the same
 * transaction. If no row matched, nothing (including no slot change)
 * happens.
 */
function deleteAppointment(pool, id) {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, index_1.withTransaction)(pool, (client) => __awaiter(this, void 0, void 0, function* () {
            const { rows } = yield client.query(`DELETE FROM appointments WHERE id = $1 RETURNING ${APPOINTMENT_COLUMNS}`, [id]);
            if (rows.length === 0)
                return { ok: false, reason: 'appointment_not_found' };
            const deleted = mapAppointment(rows[0]);
            yield (0, slots_1.setSlotTaken)(client, deleted.slotId, false);
            return { ok: true, appointment: deleted };
        }));
    });
}
