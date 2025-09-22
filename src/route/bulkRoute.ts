import express from 'express';
import { BulkController } from '../controllers/bulkController';

const router = express.Router();

// Traitement en bulk de gigs
router.post('/gigs', BulkController.processBulkGigs);

// Traitement en bulk de pays
router.post('/countries', BulkController.processBulkCountries);

// Validation d'un dataset sans traitement
router.post('/validate', BulkController.validateDataset);

export default router;
