# Configuration Sécurisée des Services IA

## 🔒 Sécurité Implémentée

Ce backend a été configuré pour gérer de manière sécurisée tous les appels à l'API OpenAI, éliminant les risques de sécurité du frontend.

## 📝 Variables d'Environnement Requises

Créez un fichier `.env` dans le répertoire racine du backend avec les variables suivantes :

```env
# Configuration de la base de données MongoDB
MONGO_URI=mongodb://localhost:27017/your-database-name

# Configuration du serveur
PORT=5003

# Configuration OpenAI (OBLIGATOIRE pour les services IA)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Configuration Cloudinary (si utilisé pour l'upload d'images)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## 🚀 Routes API Disponibles

### Services IA Sécurisés

- `POST /api/ai/generate-gig-suggestions` - Génère des suggestions complètes de gig
- `POST /api/ai/generate-skills` - Génère des compétences pour un poste
- `POST /api/ai/generate-timezones` - Génère des suggestions de fuseaux horaires
- `POST /api/ai/generate-destinations` - Génère des suggestions de destinations
- `POST /api/ai/analyze-title` - Analyse un titre et génère une description

## 🛡️ Sécurité

- ✅ Clés API OpenAI stockées côté serveur uniquement
- ✅ Aucune exposition des clés API au client
- ✅ Validation des entrées côté serveur
- ✅ Gestion d'erreurs appropriée
- ✅ Rate limiting et retry logic

## 📱 Configuration Frontend

Le frontend a été mis à jour pour utiliser la variable d'environnement :
```env
VITE_BACKEND_URL=http://localhost:5003
```

## 🔧 Installation

1. Installer les dépendances :
```bash
npm install
```

2. Créer le fichier `.env` avec vos clés API

3. Démarrer le serveur :
```bash
npm run dev
```

## ⚠️ Important

- Ne jamais commiter le fichier `.env` 
- Garder les clés API OpenAI secrètes
- Utiliser HTTPS en production
- Configurer CORS appropriément pour votre domaine de production
