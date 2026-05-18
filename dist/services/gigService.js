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
// Import des modèles pour le populate
require("../models/sectorModel");
require("../models/activityModel");
require("../models/industryModel");
require("../models/languageModel");
require("../models/skillModels");
require("../models/timezoneModel");
require("../models/userModel");
require("../models/companyModel");
require("../models/currencyModel");
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
    static async createGig(gigData) {
        try {
            await GigService.resolveLanguages(gigData);
            const newGig = new gigModel_1.Gig(gigData);
            await newGig.save();
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
