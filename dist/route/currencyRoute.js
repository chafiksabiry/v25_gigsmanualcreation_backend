"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const currencyController_1 = require("../controllers/currencyController");
const router = express_1.default.Router();
// Route pour récupérer toutes les devises avec pagination et filtres
router.get('/', currencyController_1.CurrencyController.getAllCurrencies);
// Route pour obtenir les statistiques des devises
router.get('/stats', currencyController_1.CurrencyController.getCurrencyStats);
// Route pour importer/seeder les devises depuis currencies.json
router.post('/seed', currencyController_1.CurrencyController.seedCurrencies);
// Route pour récupérer une devise par son ID
router.get('/id/:id', currencyController_1.CurrencyController.getCurrencyById);
// Route pour récupérer une devise par son code
router.get('/:code', currencyController_1.CurrencyController.getCurrencyByCode);
// Route pour créer une nouvelle devise
router.post('/', currencyController_1.CurrencyController.createCurrency);
// Route pour mettre à jour une devise
router.put('/:code', currencyController_1.CurrencyController.updateCurrency);
// Route pour supprimer (désactiver) une devise
router.delete('/:code', currencyController_1.CurrencyController.deleteCurrency);
exports.default = router;
