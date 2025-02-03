import multer from 'multer';

// Configuration du stockage des fichiers (par exemple, en mémoire ou sur disque)
const storage = multer.memoryStorage();  // ou .diskStorage() pour sauvegarder sur disque

// Configuration de Multer (limite de taille, types de fichiers, etc.)
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },  // Limite de taille de fichier (10MB par exemple)
  fileFilter: (req, file, cb) => {
    // Vérifie le type de fichier, accepte seulement certains types
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);  // Fichier valide
    } else {
      cb(null, false);  // Fichier invalide
    }
  },
});
