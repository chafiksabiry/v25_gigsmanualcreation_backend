"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sectorController_1 = require("../controllers/sectorController");
const router = express_1.default.Router();
// Récupérer tous les secteurs
router.get('/', sectorController_1.SectorController.getAllSectors);
// Récupérer un secteur par ID
router.get('/:id', sectorController_1.SectorController.getSectorById);
// Créer un nouveau secteur
router.post('/', sectorController_1.SectorController.createSector);
// Mettre à jour un secteur
router.put('/:id', sectorController_1.SectorController.updateSector);
// Supprimer un secteur
router.delete('/:id', sectorController_1.SectorController.deleteSector);
exports.default = router;
