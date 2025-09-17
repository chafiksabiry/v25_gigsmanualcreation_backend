import express from 'express';
import { CurrencyController } from '../controllers/currencyController';

const router = express.Router();

// Route pour récupérer toutes les devises avec pagination et filtres
router.get('/', CurrencyController.getAllCurrencies);

// Route pour obtenir les statistiques des devises
router.get('/stats', CurrencyController.getCurrencyStats);

// Route pour importer/seeder les devises depuis currencies.json
router.post('/seed', CurrencyController.seedCurrencies);

// Route pour récupérer une devise par son code
router.get('/:code', CurrencyController.getCurrencyByCode);

// Route pour créer une nouvelle devise
router.post('/', CurrencyController.createCurrency);

// Route pour mettre à jour une devise
router.put('/:code', CurrencyController.updateCurrency);

// Route pour supprimer (désactiver) une devise
router.delete('/:code', CurrencyController.deleteCurrency);

export default router;
