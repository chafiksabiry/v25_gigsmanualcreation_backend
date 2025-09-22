"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Activity = exports.ActivitySchema = void 0;
const mongoose_1 = require("mongoose");
exports.ActivitySchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String, required: false },
}, { timestamps: true });
exports.Activity = (0, mongoose_1.model)('Activity', exports.ActivitySchema);
