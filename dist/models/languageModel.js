"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Language = exports.LanguageSchema = void 0;
const mongoose_1 = require("mongoose");
exports.LanguageSchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true },
    iso639_1: { type: String, required: true, unique: true },
    description: { type: String, required: false },
}, { timestamps: true });
exports.Language = (0, mongoose_1.model)('Language', exports.LanguageSchema);
