"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const countryController_1 = require("../controllers/countryController");
const router = express_1.default.Router();
// Routes pour les pays (countries)
/**
 * @route GET /api/countries
 * @desc Récupérer tous les pays avec pagination et recherche
 * @query page - Numéro de page (défaut: 1)
 * @query limit - Nombre d'éléments par page (défaut: 50)
 * @query search - Terme de recherche (optionnel)
 */
router.get('/', countryController_1.CountryController.getAllCountries);
/**
 * @route GET /api/countries/:id
 * @desc Récupérer un pays par son ID
 * @param id - ID MongoDB du pays
 */
router.get('/:id', countryController_1.CountryController.getCountryById);
/**
 * @route GET /api/countries/code/:code
 * @desc Récupérer un pays par son code CCA2
 * @param code - Code CCA2 du pays (ex: FR, US, JM)
 */
router.get('/code/:code', countryController_1.CountryController.getCountryByCode);
/**
 * @route POST /api/countries
 * @desc Créer un nouveau pays
 * @body Country data following the schema
 */
router.post('/', countryController_1.CountryController.createCountry);
/**
 * @route POST /api/countries/bulk
 * @desc Créer plusieurs pays en une fois
 * @body { countries: Country[] }
 */
router.post('/bulk', countryController_1.CountryController.createMultipleCountries);
/**
 * @route PUT /api/countries/:id
 * @desc Mettre à jour un pays
 * @param id - ID MongoDB du pays
 * @body Partial country data
 */
router.put('/:id', countryController_1.CountryController.updateCountry);
/**
 * @route DELETE /api/countries/:id
 * @desc Supprimer un pays
 * @param id - ID MongoDB du pays
 */
router.delete('/:id', countryController_1.CountryController.deleteCountry);
exports.default = router;
