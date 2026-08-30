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
exports.createAilment = createAilment;
exports.listAilments = listAilments;
exports.getAilment = getAilment;
exports.updateAilment = updateAilment;
exports.deleteAilment = deleteAilment;
exports.therapiesForAilment = therapiesForAilment;
const therapies_1 = require("./therapies");
function mapAilment(row) {
    return {
        id: row.id,
        agentId: row.agent_id,
        category: row.category,
        title: row.title,
        description: row.description,
        status: row.status,
        createdAt: row.created_at.toISOString(),
    };
}
const AILMENT_COLUMNS = 'id, agent_id, category, title, description, status, created_at';
function createAilment(executor, input) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows } = yield executor.query(`INSERT INTO ailments (agent_id, category, title, description)
     VALUES ($1, $2, $3, $4)
     RETURNING ${AILMENT_COLUMNS}`, [input.agentId, input.category, input.title, input.description]);
        return mapAilment(rows[0]);
    });
}
function listAilments(executor) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows } = yield executor.query(`SELECT ${AILMENT_COLUMNS} FROM ailments ORDER BY id DESC`);
        return rows.map(mapAilment);
    });
}
function getAilment(executor, id) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows } = yield executor.query(`SELECT ${AILMENT_COLUMNS} FROM ailments WHERE id = $1`, [id]);
        return rows[0] ? mapAilment(rows[0]) : undefined;
    });
}
/**
 * Partial update. Only columns present in `patch` are included in the
 * SQL — the column *names* are always one of the five hardcoded
 * literals below (never derived from user input), and every *value* is
 * still passed as a `$n` placeholder, never concatenated into the query
 * string. Returns undefined if the ailment doesn't exist, and returns
 * the unchanged current row (not an error) if `patch` is empty.
 */
function updateAilment(executor, id, patch) {
    return __awaiter(this, void 0, void 0, function* () {
        const setClauses = [];
        const values = [];
        let paramIndex = 1;
        if (patch.agentId !== undefined) {
            setClauses.push(`agent_id = $${paramIndex++}`);
            values.push(patch.agentId);
        }
        if (patch.category !== undefined) {
            setClauses.push(`category = $${paramIndex++}`);
            values.push(patch.category);
        }
        if (patch.title !== undefined) {
            setClauses.push(`title = $${paramIndex++}`);
            values.push(patch.title);
        }
        if (patch.description !== undefined) {
            setClauses.push(`description = $${paramIndex++}`);
            values.push(patch.description);
        }
        if (patch.status !== undefined) {
            setClauses.push(`status = $${paramIndex++}`);
            values.push(patch.status);
        }
        if (setClauses.length === 0) {
            return getAilment(executor, id);
        }
        values.push(id);
        const { rows } = yield executor.query(`UPDATE ailments SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING ${AILMENT_COLUMNS}`, values);
        return rows[0] ? mapAilment(rows[0]) : undefined;
    });
}
/** Returns true if a row was deleted, false if no ailment had that id. */
function deleteAilment(executor, id) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const result = yield executor.query('DELETE FROM ailments WHERE id = $1', [id]);
        return ((_a = result.rowCount) !== null && _a !== void 0 ? _a : 0) > 0;
    });
}
/**
 * Therapies whose categories include this ailment's category. Returns
 * undefined (not an empty array) if the ailment itself doesn't exist,
 * so callers can distinguish "no ailment" (404) from "ailment exists,
 * no matching therapies" (empty list).
 */
function therapiesForAilment(executor, ailmentId) {
    return __awaiter(this, void 0, void 0, function* () {
        const ailment = yield getAilment(executor, ailmentId);
        if (!ailment)
            return undefined;
        const { rows } = yield executor.query('SELECT id, name, description, categories FROM therapies WHERE $1 = ANY(categories) ORDER BY id ASC', [ailment.category]);
        return rows.map(therapies_1.mapTherapy);
    });
}
