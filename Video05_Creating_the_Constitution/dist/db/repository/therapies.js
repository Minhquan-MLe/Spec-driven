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
exports.mapTherapy = mapTherapy;
exports.listTherapies = listTherapies;
exports.getTherapy = getTherapy;
function mapTherapy(row) {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        categories: row.categories,
    };
}
const THERAPY_COLUMNS = 'id, name, description, categories';
function listTherapies(executor) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows } = yield executor.query(`SELECT ${THERAPY_COLUMNS} FROM therapies ORDER BY id ASC`);
        return rows.map(mapTherapy);
    });
}
function getTherapy(executor, id) {
    return __awaiter(this, void 0, void 0, function* () {
        const { rows } = yield executor.query(`SELECT ${THERAPY_COLUMNS} FROM therapies WHERE id = $1`, [id]);
        return rows[0] ? mapTherapy(rows[0]) : undefined;
    });
}
