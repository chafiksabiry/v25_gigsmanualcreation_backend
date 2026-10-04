"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GigService = void 0;
const gigModel_1 = require("../models/gigModel");
const mongoose_1 = __importDefault(require("mongoose"));
const gigCommissionAgentFacing_1 = require("../utils/gigCommissionAgentFacing");
const languageModel_1 = require("../models/languageModel");
const axios_1 = __importDefault(require("axios"));
// Import des modèles pour le populate
const sectorModel_1 = require("../models/sectorModel");
const activityModel_1 = require("../models/activityModel");
const industryModel_1 = require("../models/industryModel");
require("../models/sectorModel");
require("../models/activityModel");
require("../models/industryModel");
require("../models/languageModel");
require("../models/skillModels");
require("../models/timezoneModel");
require("../models/countryModel");
require("../models/userModel");
require("../models/companyModel");
require("../models/currencyModel");
function isObjectIdString(value) {
    return typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
}
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/** Normalize AI/UI labels (or mixed arrays) into ObjectId strings for ref fields. */
async function resolveNamedObjectIds(values, opts) {
    if (values == null)
        return [];
    let list = Array.isArray(values) ? values : [values];
    // Tolerate accidental stringified arrays from the client.
    if (list.length === 1 && typeof list[0] === 'string') {
        const raw = list[0].trim();
        if (raw.startsWith('[') && raw.endsWith(']')) {
            try {
                const parsed = JSON.parse(raw.replace(/'/g, '"'));
                if (Array.isArray(parsed))
                    list = parsed;
            }
            catch {
                /* keep as single label */
            }
        }
    }
    const ids = [];
    for (const item of list) {
        if (item == null)
            continue;
        if (typeof item === 'object' && item !== null && item._id) {
            const nested = String(item._id);
            if (isObjectIdString(nested))
                ids.push(nested);
            continue;
        }
        const raw = String(item).trim();
        if (!raw)
            continue;
        if (isObjectIdString(raw)) {
            ids.push(raw);
            continue;
        }
        const existing = await opts.findByName(raw);
        if (existing?._id) {
            ids.push(String(existing._id));
            continue;
        }
        if (opts.createByName) {
            const created = await opts.createByName(raw);
            if (created?._id)
                ids.push(String(created._id));
        }
    }
    return [...new Set(ids)];
}
class GigService {
    constructor(gigRepository) {
        this.gigRepository = gigRepository;
    }
    static async resolveLanguages(gigData) {
        if (gigData.skills && gigData.skills.languages) {
            for (const langItem of gigData.skills.languages) {
                if (langItem.language && typeof langItem.language === 'string' && !mongoose_1.default.Types.ObjectId.isValid(langItem.language)) {
                    const languageDoc = await languageModel_1.Language.findOne({ name: langItem.language });
                    if (languageDoc) {
                        langItem.language = languageDoc._id;
                    }
                    else {
                        const fallbackDoc = await languageModel_1.Language.findOne({ name: new RegExp(`^${langItem.language}$`, 'i') });
                        if (fallbackDoc) {
                            langItem.language = fallbackDoc._id;
                        }
                    }
                }
            }
        }
    }
    /** Map sector/industry/activity names → ObjectIds before mongoose cast. */
    static async resolveTaxonomyRefs(gigData) {
        if (!gigData || typeof gigData !== 'object')
            return;
        if (gigData.sectors != null) {
            gigData.sectors = await resolveNamedObjectIds(gigData.sectors, {
                findByName: async (name) => sectorModel_1.Sector.findOne({
                    $or: [
                        { name: new RegExp(`^${escapeRegex(name)}$`, 'i') },
                        { 'name_i18n.en': new RegExp(`^${escapeRegex(name)}$`, 'i') },
                        { 'name_i18n.fr': new RegExp(`^${escapeRegex(name)}$`, 'i') },
                    ],
                }),
                createByName: async (name) => sectorModel_1.Sector.findOneAndUpdate({ name }, {
                    $setOnInsert: {
                        name,
                        name_i18n: { en: name, fr: name },
                        description: name,
                    },
                }, { upsert: true, new: true }),
            });
        }
        if (gigData.industries != null) {
            gigData.industries = await resolveNamedObjectIds(gigData.industries, {
                findByName: async (name) => industryModel_1.Industry.findOne({
                    $or: [
                        { name: new RegExp(`^${escapeRegex(name)}$`, 'i') },
                        { 'name_i18n.en': new RegExp(`^${escapeRegex(name)}$`, 'i') },
                        { 'name_i18n.fr': new RegExp(`^${escapeRegex(name)}$`, 'i') },
                    ],
                }),
            });
        }
        if (gigData.activities != null) {
            gigData.activities = await resolveNamedObjectIds(gigData.activities, {
                findByName: async (name) => activityModel_1.Activity.findOne({
                    $or: [
                        { name: new RegExp(`^${escapeRegex(name)}$`, 'i') },
                        { 'name_i18n.en': new RegExp(`^${escapeRegex(name)}$`, 'i') },
                        { 'name_i18n.fr': new RegExp(`^${escapeRegex(name)}$`, 'i') },
                    ],
                }),
            });
        }
    }
    static async createGig(gigData) {
        try {
            await GigService.resolveLanguages(gigData);
            await GigService.resolveTaxonomyRefs(gigData);
            const newGig = new gigModel_1.Gig(gigData);
            await newGig.save();
            // Update onboarding progress (Step 3: Create a Gig)
            try {
                const onboardingUrl = `https://v25searchcompanywizardbackend-production.up.railway.app/api/onboarding/phases/2/steps/3/complete?companyId=${newGig.companyId}`;
                console.log(`[GigService] Calling onboarding API: ${onboardingUrl}`);
                const response = await axios_1.default.put(onboardingUrl);
                console.log(`[GigService] Onboarding update response status:`, response.status);
            }
            catch (onboardingError) {
                console.error(`[GigService] Failed to update onboarding progress:`, onboardingError);
                // We don't fail the gig creation if onboarding update fails, but we log it.
            }
            return (0, gigCommissionAgentFacing_1.enrichGigForApi)(newGig);
        }
        catch (error) {
            console.error("Error in createGig:", error);
            if (error.name === "ValidationError") {
                throw new Error("Validation failed: " + Object.values(error.errors).map((err) => err.message).join(", "));
            }
            throw new Error("Failed to create Gig");
        }
    }
    static async getAllGigs() {
        try {
            const gigs = await gigModel_1.Gig.find()
                .populate('sectors')
                .populate('activities')
                .populate('industries')
                .populate('destination_zone')
                .populate('availability.time_zone')
                .populate('commission.currency')
                .populate('team.territories')
                .populate('skills.professional.skill')
                .populate('skills.technical.skill')
                .populate('skills.soft.skill')
                .populate('skills.languages.language');
            return (0, gigCommissionAgentFacing_1.enrichGigsForApi)(gigs);
        }
        catch (error) {
            console.error("Error in getAllGigs:", error);
            throw new Error("Failed to retrieve gigs");
        }
    }
    static async getActiveGigs() {
        try {
            const activeGigs = await gigModel_1.Gig.find({ status: 'active' })
                .populate('sectors')
                .populate('activities')
                .populate('industries')
                .populate('destination_zone')
                .populate('availability.time_zone')
                .populate('commission.currency')
                .populate('team.territories')
                .populate('skills.professional.skill')
                .populate('skills.technical.skill')
                .populate('skills.soft.skill')
                .populate('skills.languages.language')
                .populate('companyId');
            return (0, gigCommissionAgentFacing_1.enrichGigsForApi)(activeGigs);
        }
        catch (error) {
            console.error("Error in getActiveGigs:", error);
            throw new Error("Failed to retrieve active gigs");
        }
    }
    static async getGigById(id) {
        try {
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                throw new Error("Invalid Gig ID format");
            }
            const gig = await gigModel_1.Gig.findById(id)
                .populate('sectors')
                .populate('activities')
                .populate('industries')
                .populate('destination_zone')
                .populate('availability.time_zone')
                .populate('commission.currency')
                .populate('team.territories')
                .populate('skills.professional.skill')
                .populate('skills.technical.skill')
                .populate('skills.soft.skill')
                .populate('skills.languages.language');
            if (!gig) {
                throw new Error("Gig not found");
            }
            return (0, gigCommissionAgentFacing_1.enrichGigForApi)(gig);
        }
        catch (error) {
            console.error("Error in getGigById:", error);
            throw new Error("Failed to retrieve gig");
        }
    }
    static async getGigDetailsById(id) {
        try {
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                throw new Error("Invalid Gig ID format");
            }
            const gig = await gigModel_1.Gig.findById(id)
                .populate('sectors')
                .populate('activities')
                .populate('industries')
                .populate('destination_zone')
                .populate('availability.time_zone')
                .populate('commission.currency')
                .populate('team.territories')
                .populate('skills.professional.skill')
                .populate('skills.technical.skill')
                .populate('skills.soft.skill')
                .populate('skills.languages.language')
                .populate('companyId');
            if (!gig) {
                throw new Error("Gig not found");
            }
            return (0, gigCommissionAgentFacing_1.enrichGigForApi)(gig);
        }
        catch (error) {
            console.error("Error in getGigDetailsById:", error);
            throw new Error("Failed to retrieve gig details");
        }
    }
    static async updateGig(id, updateData) {
        try {
            await GigService.resolveLanguages(updateData);
            await GigService.resolveTaxonomyRefs(updateData);
            console.log('🔍 SERVICE - updateGig called with ID:', id);
            console.log('🔍 SERVICE - updateData:', JSON.stringify(updateData, null, 2));
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                console.log('❌ SERVICE - Invalid Gig ID format:', id);
                throw new Error("Invalid Gig ID format");
            }
            console.log('🔍 SERVICE - Calling Gig.findByIdAndUpdate...');
            // Utiliser $set pour la mise à jour partielle
            const updatedGig = await gigModel_1.Gig.findByIdAndUpdate(id, { $set: updateData }, {
                new: true,
                runValidators: true
            });
            if (!updatedGig) {
                console.log('❌ SERVICE - Gig not found with ID:', id);
                throw new Error("Gig not found");
            }
            console.log('✅ SERVICE - Gig updated successfully:', updatedGig._id);
            return (0, gigCommissionAgentFacing_1.enrichGigForApi)(updatedGig);
        }
        catch (error) {
            console.error("❌ SERVICE - Error in updateGig:", error);
            console.error("❌ SERVICE - Error details:", error instanceof Error ? error.message : 'Unknown error');
            console.error("❌ SERVICE - Error stack:", error instanceof Error ? error.stack : 'No stack trace');
            throw error;
        }
    }
    async updateGigInstance(id, updateData) {
        try {
            const existingGig = await this.gigRepository.findById(id);
            if (!existingGig) {
                throw new Error('Gig not found');
            }
            const updatedGig = await this.gigRepository.update(id, updateData);
            return updatedGig;
        }
        catch (error) {
            throw error;
        }
    }
    cleanUpdateData(data) {
        // Supprimer les champs que vous ne voulez pas mettre à jour
        const { createdAt, updatedAt, __v, _id, ...cleanedData } = data;
        return cleanedData;
    }
    static async getGigDestinationZoneById(id) {
        try {
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                throw new Error("Invalid Gig ID format");
            }
            const gig = await gigModel_1.Gig.findById(id).select('destination_zone');
            if (!gig) {
                throw new Error("Gig not found");
            }
            return gig.destination_zone;
        }
        catch (error) {
            console.error("Error in getGigDestinationZoneById:", error);
            throw new Error("Failed to retrieve gig destination zone");
        }
    }
    static async deleteGig(id) {
        try {
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                throw new Error("Invalid Gig ID format");
            }
            const deletedGig = await gigModel_1.Gig.findByIdAndDelete(id);
            if (!deletedGig) {
                throw new Error("Gig not found");
            }
            return (0, gigCommissionAgentFacing_1.enrichGigForApi)(deletedGig);
        }
        catch (error) {
            console.error("Error in deleteGig:", error);
            throw new Error("Failed to delete gig");
        }
    }
    static async getGigsByUserId(userId) {
        try {
            if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
                throw new Error("Invalid User ID format");
            }
            const gigs = await gigModel_1.Gig.find({ userId })
                .populate('sectors')
                .populate('activities')
                .populate('industries')
                .populate('destination_zone')
                .populate('availability.time_zone')
                .populate('commission.currency')
                .populate('team.territories')
                .populate('skills.professional.skill')
                .populate('skills.technical.skill')
                .populate('skills.soft.skill')
                .populate('skills.languages.language');
            return (0, gigCommissionAgentFacing_1.enrichGigsForApi)(gigs);
        }
        catch (error) {
            console.error("Error in getGigsByUserId:", error);
            throw new Error("Failed to retrieve gigs");
        }
    }
    static async getGigsByCompanyId(companyId) {
        try {
            if (!mongoose_1.default.Types.ObjectId.isValid(companyId)) {
                throw new Error("Invalid Company ID format");
            }
            const gigs = await gigModel_1.Gig.find({ companyId })
                .populate('sectors')
                .populate('activities')
                .populate('industries')
                .populate('destination_zone')
                .populate('availability.time_zone')
                .populate('commission.currency')
                .populate('team.territories')
                .populate('skills.professional.skill')
                .populate('skills.technical.skill')
                .populate('skills.soft.skill')
                .populate('skills.languages.language');
            return (0, gigCommissionAgentFacing_1.enrichGigsForApi)(gigs);
        }
        catch (error) {
            console.error("Error in getGigsByCompanyId:", error);
            throw new Error("Failed to retrieve gigs");
        }
    }
    static async getCompanyByUserId(userId) {
        try {
            if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
                throw new Error("Invalid User ID format");
            }
            // Trouver d'abord un gig associé à cet utilisateur
            const gig = await gigModel_1.Gig.findOne({ userId });
            if (!gig) {
                return null;
            }
            // Si un gig est trouvé, retourner la company associée
            return gig.companyId;
        }
        catch (error) {
            console.error("Error in getCompanyByUserId:", error);
            throw new Error("Failed to retrieve company");
        }
    }
    static async getLastGigByCompanyId(companyId) {
        try {
            if (!mongoose_1.default.Types.ObjectId.isValid(companyId)) {
                throw new Error("Invalid Company ID format");
            }
            const lastGig = await gigModel_1.Gig.findOne({ companyId })
                .sort({ createdAt: -1 })
                .limit(1)
                .populate('sectors')
                .populate('activities')
                .populate('industries')
                .populate('destination_zone')
                .populate('availability.time_zone')
                .populate('commission.currency')
                .populate('team.territories')
                .populate('skills.professional.skill')
                .populate('skills.technical.skill')
                .populate('skills.soft.skill')
                .populate('skills.languages.language');
            return lastGig ? (0, gigCommissionAgentFacing_1.enrichGigForApi)(lastGig) : null;
        }
        catch (error) {
            console.error("Error in getLastGigByCompanyId:", error);
            throw new Error("Failed to retrieve last gig for company");
        }
    }
}
exports.GigService = GigService;
