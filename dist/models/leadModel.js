"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lead = exports.LeadSchema = void 0;
const mongoose_1 = require("mongoose");
const mongoose_2 = __importDefault(require("mongoose"));
exports.LeadSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    Activity_Tag: { type: String, default: null },
    Deal_Name: { type: String, required: true },
    Email_1: { type: String, required: true },
    Last_Activity_Time: { type: Date, required: true },
    Phone: { type: String, default: null },
    Pipeline: { type: String, required: true },
    Stage: { type: String, required: true },
    companyId: { type: mongoose_2.default.Schema.Types.ObjectId, required: true },
    gigId: { type: mongoose_2.default.Schema.Types.ObjectId, required: true },
    refreshToken: { type: String, required: true },
    userId: { type: mongoose_2.default.Schema.Types.ObjectId, required: true }
}, { timestamps: true });
exports.Lead = (0, mongoose_1.model)('Lead', exports.LeadSchema);
