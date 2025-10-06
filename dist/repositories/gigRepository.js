"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GigRepository = void 0;
const gigModel_1 = require("../models/gigModel");
class GigRepository {
    constructor() {
        this.model = gigModel_1.Gig;
    }
    static async create(data) {
        const gig = new gigModel_1.Gig(data);
        return await gig.save();
    }
    async findById(id) {
        return this.model.findById(id);
    }
    static async getAll() {
        return await gigModel_1.Gig.find();
    }
    async update(id, data) {
        return this.model.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: true
        });
    }
    static async delete(id) {
        return await gigModel_1.Gig.findByIdAndDelete(id);
    }
    static async getLastGigByCompanyId(companyId) {
        return await gigModel_1.Gig.findOne({ companyId })
            .sort({ createdAt: -1 })
            .limit(1);
    }
}
exports.GigRepository = GigRepository;
