"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Industry = exports.IndustrySchema = void 0;
const mongoose_1 = require("mongoose");
const i18nStringSchema = new mongoose_1.Schema({
    en: { type: String, trim: true, default: '' },
    fr: { type: String, trim: true, default: '' },
}, { _id: false });
exports.IndustrySchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, required: false },
    name_i18n: { type: i18nStringSchema, required: false },
    description_i18n: { type: i18nStringSchema, required: false },
}, { timestamps: true });
exports.Industry = (0, mongoose_1.model)('Industry', exports.IndustrySchema);
