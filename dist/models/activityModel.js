"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Activity = exports.ActivitySchema = void 0;
const mongoose_1 = require("mongoose");
const i18nStringSchema = new mongoose_1.Schema({
    en: { type: String, trim: true, default: '' },
    fr: { type: String, trim: true, default: '' },
}, { _id: false });
exports.ActivitySchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, required: false },
    name_i18n: { type: i18nStringSchema, required: false },
    description_i18n: { type: i18nStringSchema, required: false },
}, { timestamps: true });
exports.Activity = (0, mongoose_1.model)('Activity', exports.ActivitySchema);
