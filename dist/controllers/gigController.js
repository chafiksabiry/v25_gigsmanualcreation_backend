"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GigController = void 0;
const gigService_1 = require("../services/gigService");
const mongoose_1 = __importDefault(require("mongoose"));
const gigRepository_1 = require("../repositories/gigRepository");
const i18n_iso_countries_1 = __importDefault(require("i18n-iso-countries"));
const leadModel_1 = require("../models/leadModel");
const countryModel_1 = require("../models/countryModel");
// Initialiser les pays en français et en anglais
i18n_iso_countries_1.default.registerLocale(require('i18n-iso-countries/langs/fr.json'));
i18n_iso_countries_1.default.registerLocale(require('i18n-iso-countries/langs/en.json'));
// Fonction pour obtenir le code alpha-2 à partir d'un nom de pays ou d'un code
const getCountryCode = (input) => {
    // Si c'est déjà un code alpha-2 valide, le retourner en majuscules
    if (i18n_iso_countries_1.default.isValid(input) && input.length === 2) {
        return input.toUpperCase();
    }
    // Essayer de trouver le code à partir du nom du pays en français
    let code = i18n_iso_countries_1.default.getAlpha2Code(input, 'fr');
    if (!code) {
        // Si pas trouvé en français, essayer en anglais
        code = i18n_iso_countries_1.default.getAlpha2Code(input, 'en');
    }
    return code ? code.toUpperCase() : null;
};
class GigController {
    constructor() {
        this.gigService = new gigService_1.GigService(new gigRepository_1.GigRepository());
    }
    static async createGig(req, res) {
        try {
            if (!req.body.title || !req.body.description) {
                return res.status(400).json({ message: "Title and description are required", data: null });
            }
            // Valider que destination_zone est un ObjectId valide si fourni
            if (req.body.destination_zone && !mongoose_1.default.Types.ObjectId.isValid(req.body.destination_zone)) {
                return res.status(400).json({
                    message: "destination_zone must be a valid MongoDB ObjectId",
                    data: null
                });
            }
            const newGig = await gigService_1.GigService.createGig(req.body);
            res.status(201).json({ message: "Gig created successfully", data: newGig });
        }
        catch (error) {
            console.error("Error in createGig:", error);
            res.status(500).json({ message: error.message || "Failed to create Gig", data: null });
        }
    }
    static async getAllGigs(req, res) {
        try {
            const gigs = await gigService_1.GigService.getAllGigs();
            res.status(200).json({ message: "Gigs retrieved successfully", data: gigs });
        }
        catch (error) {
            console.error("Error in getAllGigs:", error);
            res.status(500).json({ message: "Failed to retrieve gigs", data: null });
        }
    }
    static async getActiveGigs(req, res) {
        try {
            const activeGigs = await gigService_1.GigService.getActiveGigs();
            res.status(200).json({ message: "Active gigs retrieved successfully", data: activeGigs });
        }
        catch (error) {
            console.error("Error in getActiveGigs:", error);
            res.status(500).json({ message: "Failed to retrieve active gigs", data: null });
        }
    }
    static async getGigById(req, res) {
        try {
            if (!mongoose_1.default.Types.ObjectId.isValid(req.params.id)) {
                return res.status(400).json({ message: "Invalid Gig ID format", data: null });
            }
            const gig = await gigService_1.GigService.getGigById(req.params.id);
            if (!gig) {
                return res.status(404).json({ message: "Gig not found", data: null });
            }
            res.status(200).json({ message: "Gig retrieved successfully", data: gig });
        }
        catch (error) {
            console.error("Error in getGigById:", error);
            res.status(500).json({ message: "Failed to retrieve gig", data: null });
        }
    }
    static async getGigDetailsById(req, res) {
        try {
            if (!mongoose_1.default.Types.ObjectId.isValid(req.params.id)) {
                return res.status(400).json({ message: "Invalid Gig ID format", data: null });
            }
            const gigDetails = await gigService_1.GigService.getGigDetailsById(req.params.id);
            if (!gigDetails) {
                return res.status(404).json({ message: "Gig not found", data: null });
            }
            res.status(200).json({ message: "Gig details retrieved successfully", data: gigDetails });
        }
        catch (error) {
            console.error("Error in getGigDetailsById:", error);
            res.status(500).json({ message: "Failed to retrieve gig details", data: null });
        }
    }
    static async updateGig(req, res) {
        try {
            const id = req.params.id;
            const updateData = req.body;
            console.log('🔍 BACKEND - Update gig request received');
            console.log('🔍 BACKEND - Gig ID:', id);
            console.log('🔍 BACKEND - Update data:', JSON.stringify(updateData, null, 2));
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                console.log('❌ BACKEND - Invalid Gig ID format:', id);
                return res.status(400).json({ message: "Invalid Gig ID format", data: null });
            }
            // Valider que destination_zone est un ObjectId valide si fourni dans les données de mise à jour
            if (updateData.destination_zone && !mongoose_1.default.Types.ObjectId.isValid(updateData.destination_zone)) {
                console.log('❌ BACKEND - Invalid destination_zone ObjectId:', updateData.destination_zone);
                return res.status(400).json({
                    message: "destination_zone must be a valid MongoDB ObjectId",
                    data: null
                });
            }
            // Si on active le gig, vérifier le solde de la company + setupSteps
            if (updateData.status === 'active') {
                try {
                    const existingGig = await gigService_1.GigService.getGigById(id);
                    if (existingGig) {
                        const REQUIRED_SETUP_KEYS = [
                            'telephony',
                            'uploadContacts',
                            'callScript',
                            'knowledgeBase',
                            'repOnboarding',
                            'sessionPlanning',
                        ];
                        const steps = existingGig.setupSteps || {};
                        const missingSteps = REQUIRED_SETUP_KEYS.filter((k) => !steps[k]);
                        if (missingSteps.length > 0) {
                            console.log(`❌ BACKEND - Cannot activate gig ${id}: missing setup steps:`, missingSteps.join(', '));
                            return res.status(400).json({
                                message: 'Impossible d\'activer ce gig : complétez toutes les étapes de configuration avant l\'activation.',
                                data: { missingSteps },
                            });
                        }
                    }
                    if (existingGig && existingGig.companyId) {
                        const companyId = existingGig.companyId._id || existingGig.companyId;
                        const compOrchestratorUrl = process.env.COMPORCHESTRATOR_BACK_URL || 'https://v25comporchestratorback-production.up.railway.app';
                        console.log(`🔍 BACKEND - Verifying balance for company ${companyId} at ${compOrchestratorUrl}`);
                        const balanceResponse = await fetch(`${compOrchestratorUrl}/api/escrow/wallet/${companyId}`);
                        if (balanceResponse.ok) {
                            const balanceData = await balanceResponse.json();
                            console.log(`🔍 BACKEND - Balance data received:`, JSON.stringify(balanceData));
                            if (balanceData.success && balanceData.data) {
                                const balance = balanceData.data.balance || 0;
                                if (balance <= 0) {
                                    console.log(`❌ BACKEND - Insufficient balance (${balance} €) for company ${companyId}`);
                                    return res.status(400).json({
                                        message: "Solde insuffisant. Vous devez alimenter votre compte pour activer ce gig.",
                                        data: null
                                    });
                                }
                            }
                        }
                        else {
                            console.warn(`⚠️ BACKEND - Escrow wallet API returned non-OK status: ${balanceResponse.status}`);
                        }
                    }
                }
                catch (checkError) {
                    console.error('⚠️ BACKEND - Failed to verify company balance:', checkError);
                    // Permettre de continuer en cas d'erreur de connexion au microservice pour éviter de bloquer l'application
                }
            }
            console.log('🔍 BACKEND - Calling GigService.updateGig...');
            const updatedGig = await gigService_1.GigService.updateGig(id, updateData);
            if (!updatedGig) {
                console.log('❌ BACKEND - Gig not found:', id);
                return res.status(404).json({ message: "Gig not found", data: null });
            }
            console.log('✅ BACKEND - Gig updated successfully:', updatedGig._id);
            return res.status(200).json({
                message: "Gig updated successfully",
                data: updatedGig
            });
        }
        catch (error) {
            console.error('❌ BACKEND - Error in updateGig:', error);
            console.error('❌ BACKEND - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
            return res.status(500).json({
                message: "Failed to update gig",
                data: null
            });
        }
    }
    /**
     * PATCH /gigs/:id/setup-steps
     *
     * Updates one or more flags inside the per-gig activation checklist
     * (`setupSteps`). Accepts a partial body — only provided fields are
     * touched. Unknown keys are rejected to keep the schema clean.
     *
     * Body: { telephony?: boolean, uploadContacts?: boolean, ... }
     * Returns the updated gig document.
     */
    static async updateSetupSteps(req, res) {
        try {
            const id = req.params.id;
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ message: 'Invalid Gig ID format', data: null });
            }
            const allowedKeys = [
                'telephony',
                'uploadContacts',
                'callScript',
                'knowledgeBase',
                'repOnboarding',
                'sessionPlanning',
                'gigActivation',
            ];
            const body = req.body || {};
            const $set = {};
            for (const key of allowedKeys) {
                if (typeof body[key] === 'boolean') {
                    // Use the dotted-path form so mongoose only touches the
                    // requested sub-key without overwriting siblings.
                    $set[`setupSteps.${key}`] = body[key];
                }
            }
            if (Object.keys($set).length === 0) {
                return res.status(400).json({
                    message: 'No valid setupSteps fields provided',
                    data: null,
                });
            }
            const updatedGig = await gigService_1.GigService.updateGig(id, $set);
            if (!updatedGig) {
                return res.status(404).json({ message: 'Gig not found', data: null });
            }
            return res.status(200).json({
                message: 'Setup steps updated successfully',
                data: updatedGig,
            });
        }
        catch (error) {
            console.error('❌ BACKEND - Error in updateSetupSteps:', error);
            return res.status(500).json({
                message: 'Failed to update setup steps',
                data: null,
            });
        }
    }
    static async getGigDestinationZoneById(req, res) {
        try {
            console.log('🔍 getGigDestinationZoneById - Gig ID:', req.params.id);
            if (!mongoose_1.default.Types.ObjectId.isValid(req.params.id)) {
                console.log('❌ Invalid Gig ID format:', req.params.id);
                return res.status(400).json({ message: "Invalid Gig ID format", data: null });
            }
            const gig = await gigService_1.GigService.getGigById(req.params.id);
            console.log('🔍 Gig found:', gig ? 'Yes' : 'No');
            if (!gig) {
                console.log('❌ Gig not found');
                return res.status(404).json({ message: "Gig not found", data: null });
            }
            const destinationZone = gig.destination_zone;
            console.log('🔍 Destination zone:', destinationZone);
            if (!destinationZone) {
                console.log('❌ Destination zone not set for this gig');
                return res.status(404).json({ message: "Destination zone not set", data: null });
            }
            // Récupérer les informations du pays depuis la base de données
            const country = await countryModel_1.Country.findById(destinationZone).lean();
            console.log('🔍 Country found:', country ? 'Yes' : 'No');
            if (!country) {
                console.log('❌ Country not found in database for ID:', destinationZone);
                return res.status(404).json({ message: "Country not found in database", data: null });
            }
            console.log('✅ Successfully retrieved destination zone:', country.cca2);
            res.status(200).json({
                message: "Gig destination zone retrieved successfully",
                data: {
                    id: country._id,
                    code: country.cca2,
                    name: country.name.common,
                    officialName: country.name.official
                }
            });
        }
        catch (error) {
            console.error("❌ Error in getGigDestinationZoneById:", error);
            console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace');
            res.status(500).json({
                message: "Failed to retrieve gig destination zone",
                error: error instanceof Error ? error.message : 'Unknown error',
                data: null
            });
        }
    }
    static async deleteGig(req, res) {
        try {
            if (!mongoose_1.default.Types.ObjectId.isValid(req.params.id)) {
                return res.status(400).json({ message: "Invalid Gig ID format", data: null });
            }
            const deletedGig = await gigService_1.GigService.deleteGig(req.params.id);
            if (!deletedGig) {
                return res.status(404).json({ message: "Gig not found", data: null });
            }
            res.status(200).json({ message: "Gig deleted successfully", data: deletedGig });
        }
        catch (error) {
            console.error("Error in deleteGig:", error);
            res.status(500).json({ message: "Failed to delete gig", data: null });
        }
    }
    static async getGigsByUserId(req, res) {
        try {
            const userId = req.params.userId;
            if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({ message: "Invalid User ID format", data: null });
            }
            const gigs = await gigService_1.GigService.getGigsByUserId(userId);
            res.status(200).json({ message: "Gigs retrieved successfully", data: gigs });
        }
        catch (error) {
            console.error("Error in getGigsByUserId:", error);
            res.status(500).json({ message: "Failed to retrieve gigs", data: null });
        }
    }
    static async getGigsByCompanyId(req, res) {
        try {
            const companyId = req.params.companyId;
            if (!mongoose_1.default.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({ message: "Invalid Company ID format", data: null });
            }
            const gigs = await gigService_1.GigService.getGigsByCompanyId(companyId);
            res.status(200).json({ message: "Gigs retrieved successfully", data: gigs });
        }
        catch (error) {
            console.error("Error in getGigsByCompanyId:", error);
            res.status(500).json({ message: "Failed to retrieve gigs", data: null });
        }
    }
    static async hasCompanyGigs(req, res) {
        try {
            const companyId = req.params.companyId;
            if (!mongoose_1.default.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({ message: "Invalid Company ID format", data: null });
            }
            const gigs = await gigService_1.GigService.getGigsByCompanyId(companyId);
            const hasGigs = gigs.length > 0;
            res.status(200).json({
                message: "Company gig status retrieved successfully",
                data: { hasGigs }
            });
        }
        catch (error) {
            console.error("Error in hasCompanyGigs:", error);
            res.status(500).json({ message: "Failed to check company gigs", data: null });
        }
    }
    static async hasCompanyLeads(req, res) {
        try {
            const companyId = req.params.companyId;
            if (!mongoose_1.default.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({ message: "Invalid Company ID format", data: null });
            }
            const leads = await leadModel_1.Lead.find({ companyId });
            const hasLeads = leads.length > 0;
            res.status(200).json({
                message: "Company leads status retrieved successfully",
                data: { hasLeads }
            });
        }
        catch (error) {
            console.error("Error in hasCompanyLeads:", error);
            res.status(500).json({ message: "Failed to check company leads", data: null });
        }
    }
    static async getCompanyByUserId(req, res) {
        try {
            const userId = req.params.userId;
            if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({ message: "Invalid User ID format", data: null });
            }
            const company = await gigService_1.GigService.getCompanyByUserId(userId);
            if (!company) {
                return res.status(404).json({ message: "Company not found for this user", data: null });
            }
            res.status(200).json({
                message: "Company retrieved successfully",
                data: company
            });
        }
        catch (error) {
            console.error("Error in getCompanyByUserId:", error);
            res.status(500).json({ message: "Failed to retrieve company", data: null });
        }
    }
    static async getLastGigByCompanyId(req, res) {
        try {
            const companyId = req.params.companyId;
            if (!mongoose_1.default.Types.ObjectId.isValid(companyId)) {
                return res.status(400).json({ message: "Invalid Company ID format", data: null });
            }
            const lastGig = await gigService_1.GigService.getLastGigByCompanyId(companyId);
            if (!lastGig) {
                return res.status(404).json({ message: "No gigs found for this company", data: null });
            }
            res.status(200).json({
                message: "Last gig retrieved successfully",
                data: lastGig
            });
        }
        catch (error) {
            console.error("Error in getLastGigByCompanyId:", error);
            res.status(500).json({ message: "Failed to retrieve last gig", data: null });
        }
    }
    static async uploadDalleImageToCloudinary(req, res) {
        try {
            const { dallEUrl, title } = req.body;
            if (!dallEUrl) {
                return res.status(400).json({
                    message: "DALL-E URL is required",
                    data: null
                });
            }
            if (!title) {
                return res.status(400).json({
                    message: "Title is required",
                    data: null
                });
            }
            // Cloudinary configuration
            const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'bf1katla';
            const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dyqg8x26j';
            // Fetch the image from DALL-E URL (server-side, no CORS issues)
            const imageResponse = await fetch(dallEUrl);
            if (!imageResponse.ok) {
                throw new Error(`Failed to fetch image from DALL-E: ${imageResponse.statusText}`);
            }
            const imageBuffer = await imageResponse.arrayBuffer();
            // Convert to base64 for Cloudinary upload
            const base64Image = Buffer.from(imageBuffer).toString('base64');
            const dataURI = `data:image/png;base64,${base64Image}`;
            // Upload to Cloudinary using data URI
            const formData = new FormData();
            formData.append('file', dataURI);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: formData,
            });
            if (!cloudinaryResponse.ok) {
                const errorData = await cloudinaryResponse.json();
                throw new Error(errorData.error?.message || `Cloudinary error: ${cloudinaryResponse.statusText}`);
            }
            const result = await cloudinaryResponse.json();
            if (result.secure_url) {
                res.status(200).json({
                    message: "Image uploaded to Cloudinary successfully",
                    data: { url: result.secure_url }
                });
            }
            else {
                throw new Error('No URL returned from Cloudinary');
            }
        }
        catch (error) {
            console.error("Error in uploadDalleImageToCloudinary:", error);
            res.status(500).json({
                message: error.message || "Failed to upload image to Cloudinary",
                data: null
            });
        }
    }
}
exports.GigController = GigController;
