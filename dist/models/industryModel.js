"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Industry = exports.IndustrySchema = void 0;
const mongoose_1 = require("mongoose");
exports.IndustrySchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, required: false },
}, { timestamps: true });
exports.Industry = (0, mongoose_1.model)('Industry', exports.IndustrySchema);
