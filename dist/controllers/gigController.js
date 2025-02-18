"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GigController = void 0;
const gigModel_1 = require("../models/gigModel");
class GigController {
    // Fonction pour créer un nouveau gig
    static async createGig(req, res) {
        try {
            const { title, description, category, seniority, schedule, commission, leads, team, documentation, } = req.body;
            // Créer un nouvel objet Gig avec les données reçues
            const newGig = new gigModel_1.Gig({
                title,
                description,
                category,
                seniority,
                schedule,
                commission,
                leads,
                team,
                documentation,
            });
            // Sauvegarder le nouveau gig dans la base de données
            await newGig.save();
            // Retourner une réponse avec le gig créé
            return res.status(201).json({
                message: 'Gig created successfully',
                gig: newGig,
            });
        }
        catch (error) {
            // En cas d'erreur, retourner une erreur
            console.error('Error creating gig:', error);
            return res.status(500).json({
                message: 'Error creating gig',
                error: error.message,
            });
        }
    }
}
exports.GigController = GigController;
