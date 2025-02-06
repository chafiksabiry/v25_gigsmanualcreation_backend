"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GigRepository = void 0;
const gigModel_1 = require("../models/gigModel"); // Utilise le modèle Gig et non IGig
class GigRepository {
    static async create(data) {
        const gig = new gigModel_1.Gig(data); // Crée une instance de Gig
        return await gig.save();
    }
    static async getById(id) {
        return await gigModel_1.Gig.findById(id); // Utilise Gig, pas IGig
    }
    static async getAll() {
        return await gigModel_1.Gig.find(); // Utilise Gig, pas IGig
    }
    static async update(id, data) {
        return await gigModel_1.Gig.findByIdAndUpdate(id, data, { new: true }); // Utilise Gig, pas IGig
    }
    static async delete(id) {
        return await gigModel_1.Gig.findByIdAndDelete(id); // Utilise Gig, pas IGig
    }
}
exports.GigRepository = GigRepository;
