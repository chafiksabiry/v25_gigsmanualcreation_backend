"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GigService = void 0;
const gigModel_1 = require("../models/gigModel");
class GigService {
    static async createGig(gigData) {
        try {
            // Loguer les données avant de les insérer dans la base de données
            console.log("Creating gig with data:", gigData);
            // Exemple d'insertion dans une base de données (adaptez selon votre logique)
            const gig = await gigModel_1.Gig.create(gigData);
            if (!gig) {
                throw new Error("Gig creation failed");
            }
            return gig;
        }
        catch (error) {
            console.error("Error in GigService.createGig:", error); // Plus de logs ici aussi
            throw new Error("Failed to create gig in database");
        }
    }
    static async getGigById(id) {
        try {
            const gig = await gigModel_1.Gig.findById(id);
            return gig;
        }
        catch (error) {
            throw new Error("Erreur lors de la récupération du Gig");
        }
    }
    static async getAllGigs() {
        try {
            const gigs = await gigModel_1.Gig.find();
            return gigs;
        }
        catch (error) {
            throw new Error("Erreur lors de la récupération des Gigs");
        }
    }
    static async updateGig(id, updateData) {
        try {
            const updatedGig = await gigModel_1.Gig.findByIdAndUpdate(id, updateData, {
                new: true,
            });
            return updatedGig;
        }
        catch (error) {
            throw new Error("Erreur lors de la mise à jour du Gig");
        }
    }
    static async deleteGig(id) {
        try {
            const deletedGig = await gigModel_1.Gig.findByIdAndDelete(id);
            return deletedGig;
        }
        catch (error) {
            throw new Error("Erreur lors de la suppression du Gig");
        }
    }
}
exports.GigService = GigService;
