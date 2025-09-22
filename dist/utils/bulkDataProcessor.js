"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BulkDataProcessor = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
class BulkDataProcessor {
    /**
     * Traite des données en bulk avec validation et gestion d'erreurs améliorée
     */
    static async processBulkData(data, options = {}) {
        const opts = { ...this.defaultOptions, ...options };
        const result = {
            validation: {
                totalRows: data.length,
                validRows: 0,
                invalidRows: 0,
                errors: []
            },
            processing: {
                processed: 0,
                failed: 0,
                chunks: {
                    total: 0,
                    successful: 0,
                    failed: 0
                }
            }
        };
        // Étape 1: Validation des données
        console.log(`📊 Validation de ${data.length} lignes...`);
        const validData = [];
        const invalidData = [];
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            if (opts.validateFunction) {
                const validation = opts.validateFunction(item);
                if (validation.isValid) {
                    validData.push(item);
                }
                else {
                    invalidData.push({ index: i, item, errors: validation.errors });
                    result.validation.errors.push(...validation.errors.map(err => `Row ${i}: ${err}`));
                }
            }
            else {
                // Validation par défaut - vérifier que l'objet n'est pas null/undefined
                if (item && typeof item === 'object') {
                    validData.push(item);
                }
                else {
                    invalidData.push({ index: i, item, errors: ['Invalid data format'] });
                    result.validation.errors.push(`Row ${i}: Invalid data format`);
                }
            }
        }
        result.validation.validRows = validData.length;
        result.validation.invalidRows = invalidData.length;
        console.log(`✅ Validation terminée: ${validData.length} valides, ${invalidData.length} invalides`);
        if (validData.length === 0) {
            console.log('❌ Aucune donnée valide à traiter');
            return result;
        }
        // Étape 2: Traitement par chunks
        const chunks = this.createChunks(validData, opts.chunkSize);
        result.processing.chunks.total = chunks.length;
        console.log(`📦 Traitement de ${chunks.length} chunks (taille: ${opts.chunkSize})...`);
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            let retries = 0;
            let success = false;
            while (retries <= opts.maxRetries && !success) {
                try {
                    console.log(`🔄 Traitement du chunk ${i + 1}/${chunks.length} (tentative ${retries + 1})`);
                    if (opts.processFunction) {
                        await opts.processFunction(chunk);
                    }
                    result.processing.processed += chunk.length;
                    result.processing.chunks.successful++;
                    success = true;
                    console.log(`✅ Chunk ${i + 1} traité avec succès (${chunk.length} éléments)`);
                }
                catch (error) {
                    retries++;
                    console.error(`❌ Erreur chunk ${i + 1}, tentative ${retries}:`, error.message);
                    if (retries > opts.maxRetries) {
                        result.processing.failed += chunk.length;
                        result.processing.chunks.failed++;
                        result.validation.errors.push(`Chunk ${i + 1} failed after ${opts.maxRetries} retries: ${error.message}`);
                        console.error(`💥 Chunk ${i + 1} abandonné après ${opts.maxRetries} tentatives`);
                    }
                    else {
                        // Attendre avant de réessayer
                        await this.delay(1000 * retries);
                    }
                }
            }
        }
        console.log(`🎉 Traitement terminé:`);
        console.log(`   - Chunks réussis: ${result.processing.chunks.successful}/${result.processing.chunks.total}`);
        console.log(`   - Éléments traités: ${result.processing.processed}`);
        console.log(`   - Éléments échoués: ${result.processing.failed}`);
        return result;
    }
    /**
     * Divise un tableau en chunks de taille spécifiée
     */
    static createChunks(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }
    /**
     * Attendre un délai spécifié
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Validation par défaut pour les gigs
     */
    static validateGigData(item) {
        const errors = [];
        if (!item) {
            errors.push('Item is null or undefined');
            return { isValid: false, errors };
        }
        // Vérifications de base
        if (!item.title || typeof item.title !== 'string') {
            errors.push('Title is required and must be a string');
        }
        if (!item.description || typeof item.description !== 'string') {
            errors.push('Description is required and must be a string');
        }
        // Vérification des ObjectIds
        if (item.userId && !mongoose_1.default.Types.ObjectId.isValid(item.userId)) {
            errors.push('userId must be a valid MongoDB ObjectId');
        }
        if (item.companyId && !mongoose_1.default.Types.ObjectId.isValid(item.companyId)) {
            errors.push('companyId must be a valid MongoDB ObjectId');
        }
        if (item.destination_zone && !mongoose_1.default.Types.ObjectId.isValid(item.destination_zone)) {
            errors.push('destination_zone must be a valid MongoDB ObjectId');
        }
        // Vérification des tableaux
        if (item.activities && !Array.isArray(item.activities)) {
            errors.push('activities must be an array');
        }
        if (item.industries && !Array.isArray(item.industries)) {
            errors.push('industries must be an array');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    /**
     * Validation par défaut pour les pays
     */
    static validateCountryData(item) {
        const errors = [];
        if (!item) {
            errors.push('Item is null or undefined');
            return { isValid: false, errors };
        }
        if (!item.name || !item.name.common || !item.name.official) {
            errors.push('Missing required name fields (common, official)');
        }
        if (!item.cca2 || item.cca2.length !== 2) {
            errors.push('cca2 must be a 2-character country code');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
exports.BulkDataProcessor = BulkDataProcessor;
BulkDataProcessor.defaultOptions = {
    chunkSize: 25, // Réduire la taille des chunks pour éviter les timeouts
    maxRetries: 3,
};
