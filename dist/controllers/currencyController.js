"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrencyController = void 0;
const currencyModel_1 = require("../models/currencyModel");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class CurrencyController {
    /**
     * Récupérer toutes les devises
     */
    static async getAllCurrencies(req, res) {
        try {
            const { page, limit, search, isActive, paginated } = req.query;
            const query = {};
            // Filtre par statut actif
            if (isActive !== undefined) {
                query.isActive = isActive === 'true';
            }
            // Recherche par code ou nom
            if (search) {
                query.$or = [
                    { code: { $regex: search, $options: 'i' } },
                    { name: { $regex: search, $options: 'i' } }
                ];
            }
            // Par défaut, retourner toutes les devises SANS pagination
            // Utiliser la pagination seulement si 'paginated=true' est explicitement demandé
            if (paginated === 'true') {
                const pageNum = parseInt(page) || 1;
                const limitNum = Math.min(parseInt(limit) || 50, 200); // Maximum 200 par page
                const skip = (pageNum - 1) * limitNum;
                const [currencies, total] = await Promise.all([
                    currencyModel_1.Currency.find(query)
                        .sort({ code: 1 })
                        .skip(skip)
                        .limit(limitNum)
                        .lean(),
                    currencyModel_1.Currency.countDocuments(query)
                ]);
                res.status(200).json({
                    success: true,
                    data: currencies,
                    pagination: {
                        page: pageNum,
                        limit: limitNum,
                        total,
                        pages: Math.ceil(total / limitNum)
                    },
                    message: "Currencies retrieved successfully"
                });
                return;
            }
            // Comportement par défaut : retourner TOUTES les devises
            const currencies = await currencyModel_1.Currency.find(query)
                .sort({ code: 1 })
                .lean();
            const total = currencies.length;
            res.status(200).json({
                success: true,
                data: currencies,
                total,
                message: "All currencies retrieved successfully"
            });
        }
        catch (error) {
            console.error('Error getting currencies:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get currencies',
                message: error.message
            });
        }
    }
    /**
     * Récupérer une devise par son ID
     */
    static async getCurrencyById(req, res) {
        try {
            const { id } = req.params;
            // Vérifier si l'ID est un ObjectId valide
            if (!id.match(/^[0-9a-fA-F]{24}$/)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid ID format',
                    message: `Invalid MongoDB ObjectId format: ${id}`
                });
            }
            const currency = await currencyModel_1.Currency.findById(id).lean();
            if (!currency) {
                return res.status(404).json({
                    success: false,
                    error: 'Currency not found',
                    message: `Currency with ID ${id} not found`
                });
            }
            res.status(200).json({
                success: true,
                data: currency,
                message: "Currency retrieved successfully"
            });
        }
        catch (error) {
            console.error('Error getting currency by ID:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get currency',
                message: error.message
            });
        }
    }
    /**
     * Récupérer une devise par son code
     */
    static async getCurrencyByCode(req, res) {
        try {
            const { code } = req.params;
            const currency = await currencyModel_1.Currency.findOne({
                code: code.toUpperCase()
            }).lean();
            if (!currency) {
                return res.status(404).json({
                    success: false,
                    error: 'Currency not found',
                    message: `Currency with code ${code} not found`
                });
            }
            res.status(200).json({
                success: true,
                data: currency,
                message: "Currency retrieved successfully"
            });
        }
        catch (error) {
            console.error('Error getting currency:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get currency',
                message: error.message
            });
        }
    }
    /**
     * Créer une nouvelle devise
     */
    static async createCurrency(req, res) {
        try {
            const { code, name, symbol, isActive = true } = req.body;
            if (!code || !name || !symbol) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    message: 'Code, name, and symbol are required'
                });
            }
            // Vérifier si la devise existe déjà
            const existingCurrency = await currencyModel_1.Currency.findOne({
                code: code.toUpperCase()
            });
            if (existingCurrency) {
                return res.status(409).json({
                    success: false,
                    error: 'Currency already exists',
                    message: `Currency with code ${code} already exists`
                });
            }
            const currency = new currencyModel_1.Currency({
                code: code.toUpperCase(),
                name: name.trim(),
                symbol: symbol.trim(),
                isActive
            });
            await currency.save();
            res.status(201).json({
                success: true,
                data: currency,
                message: "Currency created successfully"
            });
        }
        catch (error) {
            console.error('Error creating currency:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create currency',
                message: error.message
            });
        }
    }
    /**
     * Mettre à jour une devise
     */
    static async updateCurrency(req, res) {
        try {
            const { code } = req.params;
            const { name, symbol, isActive } = req.body;
            const updateData = {};
            if (name !== undefined)
                updateData.name = name.trim();
            if (symbol !== undefined)
                updateData.symbol = symbol.trim();
            if (isActive !== undefined)
                updateData.isActive = isActive;
            const currency = await currencyModel_1.Currency.findOneAndUpdate({ code: code.toUpperCase() }, updateData, { new: true, runValidators: true });
            if (!currency) {
                return res.status(404).json({
                    success: false,
                    error: 'Currency not found',
                    message: `Currency with code ${code} not found`
                });
            }
            res.status(200).json({
                success: true,
                data: currency,
                message: "Currency updated successfully"
            });
        }
        catch (error) {
            console.error('Error updating currency:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update currency',
                message: error.message
            });
        }
    }
    /**
     * Supprimer une devise (soft delete)
     */
    static async deleteCurrency(req, res) {
        try {
            const { code } = req.params;
            const currency = await currencyModel_1.Currency.findOneAndUpdate({ code: code.toUpperCase() }, { isActive: false }, { new: true });
            if (!currency) {
                return res.status(404).json({
                    success: false,
                    error: 'Currency not found',
                    message: `Currency with code ${code} not found`
                });
            }
            res.status(200).json({
                success: true,
                data: currency,
                message: "Currency deactivated successfully"
            });
        }
        catch (error) {
            console.error('Error deleting currency:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete currency',
                message: error.message
            });
        }
    }
    /**
     * Importer les devises depuis currencies.json
     */
    static async seedCurrencies(req, res) {
        try {
            const currenciesFilePath = path_1.default.join(__dirname, '../currencies.json');
            if (!fs_1.default.existsSync(currenciesFilePath)) {
                return res.status(404).json({
                    success: false,
                    error: 'Currencies file not found',
                    message: 'currencies.json file not found'
                });
            }
            const currenciesData = JSON.parse(fs_1.default.readFileSync(currenciesFilePath, 'utf8'));
            // Extraire toutes les devises uniques du fichier
            const uniqueCurrencies = new Map();
            currenciesData.forEach((item) => {
                if (item.currencies) {
                    Object.entries(item.currencies).forEach(([code, details]) => {
                        if (code && details && details.name && details.symbol) {
                            // Garder seulement la première occurrence de chaque devise
                            if (!uniqueCurrencies.has(code)) {
                                uniqueCurrencies.set(code, {
                                    name: details.name,
                                    symbol: details.symbol
                                });
                            }
                        }
                    });
                }
            });
            console.log(`📊 Devises uniques trouvées: ${uniqueCurrencies.size}`);
            // Insérer ou mettre à jour les devises
            let created = 0;
            let updated = 0;
            let errors = 0;
            for (const [code, details] of uniqueCurrencies) {
                try {
                    const existingCurrency = await currencyModel_1.Currency.findOne({ code });
                    if (existingCurrency) {
                        // Mettre à jour si nécessaire
                        if (existingCurrency.name !== details.name || existingCurrency.symbol !== details.symbol) {
                            await currencyModel_1.Currency.findOneAndUpdate({ code }, {
                                name: details.name,
                                symbol: details.symbol,
                                isActive: true
                            });
                            updated++;
                        }
                    }
                    else {
                        // Créer nouvelle devise
                        const currency = new currencyModel_1.Currency({
                            code,
                            name: details.name,
                            symbol: details.symbol,
                            isActive: true
                        });
                        await currency.save();
                        created++;
                    }
                }
                catch (error) {
                    console.error(`Erreur pour la devise ${code}:`, error);
                    errors++;
                }
            }
            res.status(200).json({
                success: true,
                data: {
                    totalFound: uniqueCurrencies.size,
                    created,
                    updated,
                    errors
                },
                message: `Seed completed: ${created} created, ${updated} updated, ${errors} errors`
            });
        }
        catch (error) {
            console.error('Error seeding currencies:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to seed currencies',
                message: error.message
            });
        }
    }
    /**
     * Obtenir les statistiques des devises
     */
    static async getCurrencyStats(req, res) {
        try {
            const [total, active, inactive] = await Promise.all([
                currencyModel_1.Currency.countDocuments(),
                currencyModel_1.Currency.countDocuments({ isActive: true }),
                currencyModel_1.Currency.countDocuments({ isActive: false })
            ]);
            // Top 10 des devises les plus courantes par symbole
            const topSymbols = await currencyModel_1.Currency.aggregate([
                { $match: { isActive: true } },
                { $group: { _id: '$symbol', count: { $sum: 1 }, currencies: { $push: '$code' } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]);
            res.status(200).json({
                success: true,
                data: {
                    total,
                    active,
                    inactive,
                    topSymbols
                },
                message: "Currency statistics retrieved successfully"
            });
        }
        catch (error) {
            console.error('Error getting currency stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get currency statistics',
                message: error.message
            });
        }
    }
}
exports.CurrencyController = CurrencyController;
