"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gig = exports.GigSchema = void 0;
const mongoose_1 = require("mongoose");
const mongoose_2 = __importDefault(require("mongoose"));
exports.GigSchema = new mongoose_1.Schema({
    title: { type: String, required: false },
    description: { type: String, required: false },
    category: { type: String, required: false },
    userId: { type: mongoose_2.default.Schema.Types.ObjectId, ref: 'User', default: null },
    companyId: { type: mongoose_2.default.Schema.Types.ObjectId, ref: 'Company', default: null },
    destination_zone: {
        type: mongoose_2.default.Schema.Types.ObjectId,
        ref: 'Country',
        required: false
    },
    sectors: [{ type: mongoose_2.default.Schema.Types.ObjectId, ref: 'Sector', required: false }],
    activities: [{ type: mongoose_2.default.Schema.Types.ObjectId, ref: 'Activity', required: false }],
    industries: [{ type: mongoose_2.default.Schema.Types.ObjectId, ref: 'Industry', required: false }],
    seniority: {
        level: { type: String, required: false },
        yearsExperience: { type: String, required: false },
    },
    skills: {
        professional: [{
                skill: { type: mongoose_2.default.Schema.Types.ObjectId, ref: 'ProfessionalSkill', required: false },
                level: { type: Number, required: false },
                details: { type: String, required: false }
            }],
        technical: [{
                skill: { type: mongoose_2.default.Schema.Types.ObjectId, ref: 'TechnicalSkill', required: false },
                level: { type: Number, required: false },
                details: { type: String, required: false }
            }],
        soft: [{
                skill: { type: mongoose_2.default.Schema.Types.ObjectId, ref: 'SoftSkill', required: false },
                level: { type: Number, required: false },
                details: { type: String, required: false }
            }],
        languages: [{
                language: { type: mongoose_2.default.Schema.Types.ObjectId, ref: 'Language', required: false },
                proficiency: { type: String, required: false },
                iso639_1: { type: String, required: false }
            }]
    },
    availability: {
        schedule: [{
                day: { type: String, required: false },
                hours: {
                    start: { type: String, required: false },
                    end: { type: String, required: false }
                }
            }],
        time_zone: { type: mongoose_2.default.Schema.Types.ObjectId, ref: 'Timezone', required: false },
        flexibility: [{ type: String }],
        minimumHours: {
            daily: { type: Number, required: false },
            weekly: { type: Number, required: false },
            monthly: { type: Number, required: false }
        }
    },
    commission: {
        base: { type: String, required: false },
        baseAmount: { type: String, required: false },
        bonus: String,
        bonusAmount: String,
        structure: String,
        currency: { type: mongoose_2.default.Schema.Types.ObjectId, ref: 'Currency', required: false },
        minimumVolume: {
            amount: { type: String, required: false },
            period: { type: String, required: false },
            unit: { type: String, required: false },
        },
        transactionCommission: {
            type: { type: String, required: false },
            amount: { type: String, required: false },
        },
        additionalDetails: { type: String, required: false },
    },
    leads: {
        types: [
            {
                type: { type: String, enum: ['hot', 'warm', 'cold'] },
                percentage: Number,
                description: String,
                conversionRate: Number,
            },
        ],
        sources: [{ type: String }],
    },
    team: {
        size: { type: String, required: false },
        structure: [
            {
                roleId: String,
                count: Number,
                seniority: {
                    level: String,
                    yearsExperience: String,
                },
            },
        ],
        territories: [{ type: mongoose_2.default.Schema.Types.ObjectId, ref: 'Country', required: false }],
    },
    documentation: {
        product: [
            {
                name: { type: String, required: false },
                url: { type: String, required: false },
            },
        ],
        process: [
            {
                name: { type: String, required: false },
                url: { type: String, required: false },
            },
        ],
        training: [
            {
                name: { type: String, required: false },
                url: { type: String, required: false },
            },
        ],
    },
    highlights: [{ type: String, required: false }],
    deliverables: [{ type: String, required: false }],
    status: {
        type: String,
        enum: ['to_activate', 'active', 'inactive', 'archived'],
        default: 'to_activate',
        required: true
    },
}, { timestamps: true });
exports.Gig = (0, mongoose_1.model)('Gig', exports.GigSchema);
