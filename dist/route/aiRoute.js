"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const aiController_1 = require("../controllers/aiController");
const router = express_1.default.Router();
// Route pour générer des suggestions de gig complètes
router.post('/generate-gig-suggestions', aiController_1.AIController.generateGigSuggestions);
// Route pour générer des compétences
router.post('/generate-skills', aiController_1.AIController.generateSkills);
// Route pour générer des fuseaux horaires
router.post('/generate-timezones', aiController_1.AIController.generateTimezones);
// Route pour générer des destinations
router.post('/generate-destinations', aiController_1.AIController.generateDestinations);
// Route pour analyser un titre et générer une description
router.post('/analyze-title', aiController_1.AIController.analyzeTitleAndGenerateDescription);
// Route de test sans OpenAI (utilise les vraies APIs)
router.post('/test-gig-suggestions', aiController_1.AIController.testGigSuggestions);
// Route pour tester les connexions aux APIs externes
router.get('/test-api-connections', aiController_1.AIController.testApiConnections);
// Route pour tester le populate des données
router.get('/test-populate', aiController_1.AIController.testPopulateData);
// Route pour récupérer toutes les catégories
router.get('/categories', aiController_1.AIController.getCategories);
// Route pour récupérer toutes les timezones
router.get('/timezones', aiController_1.AIController.getTimezones);
// Route pour tester le mapping des activités
router.post('/test-activity-mapping', aiController_1.AIController.testActivityMapping);
exports.default = router;
