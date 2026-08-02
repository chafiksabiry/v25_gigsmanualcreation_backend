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
        commission_per_call: { type: Number, required: false },
        bonusAmount: { type: String, required: false },
        currency: { type: mongoose_2.default.Schema.Types.ObjectId, ref: 'Currency', required: false },
        minimumVolume: {
            amount: { type: String, required: false },
            period: { type: String, required: false },
            unit: { type: String, required: false },
        },
        transactionCommission: { type: Number, required: false },
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
    // Activation checklist — see the `IGig.setupSteps` JSDoc above for
    // the full per-step contract. Stored as a nested object so each
    // flag can be patched individually (`{ $set: { 'setupSteps.telephony': true } }`).
    setupSteps: {
        telephony: { type: Boolean, default: false },
        uploadContacts: { type: Boolean, default: false },
        callScript: { type: Boolean, default: false },
        knowledgeBase: { type: Boolean, default: false },
        repOnboarding: { type: Boolean, default: false },
        sessionPlanning: { type: Boolean, default: false },
        gigActivation: { type: Boolean, default: false },
    },
}, { timestamps: true });
// Keep `setupSteps.gigActivation` aligned with the gig's lifecycle:
// the very last checklist tile flips to `true` automatically the moment
// the status becomes `active`, without forcing callers to set both fields.
// We hook into both `save` (for `new Gig(...).save()`) and `findOneAndUpdate`
// (for the `PUT /:id` controller path).
exports.GigSchema.pre('save', function (next) {
    if (this.status === 'active') {
        if (!this.setupSteps) {
            // @ts-ignore — sub-doc defaults haven't been applied yet on a fresh doc
            this.setupSteps = {
                telephony: false,
                uploadContacts: false,
                callScript: false,
                knowledgeBase: false,
                repOnboarding: false,
                sessionPlanning: false,
                gigActivation: true,
            };
        }
        else {
            this.setupSteps.gigActivation = true;
        }
    }
    next();
});
exports.GigSchema.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate();
    if (!update)
        return next();
    const $set = update.$set || update;
    if ($set?.status === 'active') {
        update.$set = { ...($set || {}), 'setupSteps.gigActivation': true };
        this.setUpdate(update);
    }
    next();
});
exports.Gig = (0, mongoose_1.model)('Gig', exports.GigSchema);
