"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sector = exports.SectorSchema = void 0;
const mongoose_1 = require("mongoose");
const i18nStringSchema = new mongoose_1.Schema({
    en: { type: String, trim: true, default: '' },
    fr: { type: String, trim: true, default: '' },
}, { _id: false });
exports.SectorSchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, required: false },
    name_i18n: { type: i18nStringSchema, required: false },
    description_i18n: { type: i18nStringSchema, required: false },
}, { timestamps: true });
exports.Sector = (0, mongoose_1.model)('Sector', exports.SectorSchema);
