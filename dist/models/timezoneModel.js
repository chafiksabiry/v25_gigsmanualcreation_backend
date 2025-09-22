"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timezone = exports.TimezoneSchema = void 0;
const mongoose_1 = require("mongoose");
exports.TimezoneSchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true }, // ex: "Europe/Paris"
    offset: { type: String, required: true }, // ex: "+01:00"
    abbreviation: { type: String, required: true }, // ex: "CET"
    description: { type: String, required: false },
}, { timestamps: true });
exports.Timezone = (0, mongoose_1.model)('Timezone', exports.TimezoneSchema);
