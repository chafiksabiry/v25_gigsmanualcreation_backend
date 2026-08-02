"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sector = exports.SectorSchema = void 0;
const mongoose_1 = require("mongoose");
exports.SectorSchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, required: false },
}, { timestamps: true });
exports.Sector = (0, mongoose_1.model)('Sector', exports.SectorSchema);
