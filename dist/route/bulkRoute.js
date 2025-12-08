"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bulkController_1 = require("../controllers/bulkController");
const router = express_1.default.Router();
// Traitement en bulk de gigs
router.post('/gigs', bulkController_1.BulkController.processBulkGigs);
// Traitement en bulk de pays
router.post('/countries', bulkController_1.BulkController.processBulkCountries);
// Validation d'un dataset sans traitement
router.post('/validate', bulkController_1.BulkController.validateDataset);
exports.default = router;
