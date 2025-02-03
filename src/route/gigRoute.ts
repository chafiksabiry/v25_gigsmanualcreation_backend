import express from 'express';
import multer from 'multer';
import { GigController } from '../controllers/gigController';

const router = express.Router();

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

router.post(
  "/",
  GigController.createGig
);

export default router;