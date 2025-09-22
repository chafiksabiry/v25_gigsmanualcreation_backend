import express from 'express';
import { AIController } from '../controllers/aiController';

const router = express.Router();

// Route pour générer des suggestions de gig complètes
router.post('/generate-gig-suggestions', AIController.generateGigSuggestions);

// Route pour générer des compétences
router.post('/generate-skills', AIController.generateSkills);

// Route pour générer des fuseaux horaires
router.post('/generate-timezones', AIController.generateTimezones);

// Route pour générer des destinations
router.post('/generate-destinations', AIController.generateDestinations);

// Route pour analyser un titre et générer une description
router.post('/analyze-title', AIController.analyzeTitleAndGenerateDescription);

// Route de test sans OpenAI (utilise les vraies APIs)
router.post('/test-gig-suggestions', AIController.testGigSuggestions);

// Route pour tester les connexions aux APIs externes
router.get('/test-api-connections', AIController.testApiConnections);

// Route pour tester le populate des données
router.get('/test-populate', AIController.testPopulateData);

// Route pour récupérer toutes les catégories
router.get('/categories', AIController.getCategories);

// Route pour récupérer toutes les timezones
router.get('/timezones', AIController.getTimezones);

// Route pour tester le mapping des activités
router.post('/test-activity-mapping', AIController.testActivityMapping);

export default router;
