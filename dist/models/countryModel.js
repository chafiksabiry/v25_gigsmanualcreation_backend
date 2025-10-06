"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Country = exports.CountrySchema = void 0;
const mongoose_1 = require("mongoose");
exports.CountrySchema = new mongoose_1.Schema({
    name: {
        common: { type: String, required: true },
        official: { type: String, required: true },
        nativeName: {
            type: Map,
            of: {
                official: { type: String, required: true },
                common: { type: String, required: true }
            },
            required: false
        }
    },
    cca2: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        minlength: 2,
        maxlength: 2
    },
    flags: {
        png: { type: String, required: false },
        svg: { type: String, required: false },
        alt: { type: String, required: false }
    }
}, { timestamps: true });
// Index pour améliorer les performances de recherche (cca2 déjà indexé via unique: true)
exports.CountrySchema.index({ 'name.common': 1 });
exports.CountrySchema.index({ 'name.official': 1 });
exports.Country = (0, mongoose_1.model)('Country', exports.CountrySchema);
