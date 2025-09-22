import express from 'express';
import { SectorController } from '../controllers/sectorController';

const router = express.Router();

// Récupérer tous les secteurs
router.get('/', SectorController.getAllSectors);

// Récupérer un secteur par ID
router.get('/:id', SectorController.getSectorById);

// Créer un nouveau secteur
router.post('/', SectorController.createSector);

// Mettre à jour un secteur
router.put('/:id', SectorController.updateSector);

// Supprimer un secteur
router.delete('/:id', SectorController.deleteSector);

export default router;
