"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoftSkill = exports.SoftSkillSchema = exports.TechnicalSkill = exports.TechnicalSkillSchema = exports.ProfessionalSkill = exports.ProfessionalSkillSchema = void 0;
const mongoose_1 = require("mongoose");
exports.ProfessionalSkillSchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true },
    category: { type: String, required: false },
    description: { type: String, required: false },
}, { timestamps: true });
exports.ProfessionalSkill = (0, mongoose_1.model)('ProfessionalSkill', exports.ProfessionalSkillSchema);
exports.TechnicalSkillSchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true },
    category: { type: String, required: false },
    description: { type: String, required: false },
}, { timestamps: true });
exports.TechnicalSkill = (0, mongoose_1.model)('TechnicalSkill', exports.TechnicalSkillSchema);
exports.SoftSkillSchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true },
    category: { type: String, required: false },
    description: { type: String, required: false },
}, { timestamps: true });
exports.SoftSkill = (0, mongoose_1.model)('SoftSkill', exports.SoftSkillSchema);
