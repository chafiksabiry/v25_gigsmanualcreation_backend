"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const gigController_1 = require("../controllers/gigController");
const router = express_1.default.Router();
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads/'); // Dossier temporaire pour stocker les fichiers localement
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + '-' + file.originalname); // Nom unique pour éviter les conflits
//   }
// });
// const upload = multer({ 
//   storage: storage,
//   limits: { fileSize: 10 * 1024 * 1024 }, // Limite de taille de fichier à 10 Mo
// }).fields([
//   { name: 'product', maxCount: 10 },
//   { name: 'process', maxCount: 10 },
//   { name: 'training', maxCount: 10 }
// ]);
router.post("/", gigController_1.GigController.createGig);
exports.default = router;
