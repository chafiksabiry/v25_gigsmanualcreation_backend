# Gig Management Backend

Backend API pour la gestion et génération intelligente de gigs avec intégration OpenAI.

## 🚀 Fonctionnalités

- **Génération AI de gigs** : Suggestions intelligentes basées sur OpenAI
- **Détection intelligente de pays** : Support multilingue et références culturelles
- **API Countries** : Gestion complète des pays avec données MongoDB
- **Détection de timezone** : Intégration avec API externe de timezones

## 📋 APIs Disponibles

### Gigs
- `POST /api/ai/generate-gig-suggestions` - Génération de suggestions de gigs

### Countries  
- `GET /api/countries` - Liste tous les pays
- `GET /api/countries/:id` - Récupère un pays par ID
- `GET /api/countries/code/:code` - Récupère un pays par code (CCA2)
- `POST /api/countries` - Crée un nouveau pays
- `POST /api/countries/bulk` - Import en masse de pays

## 🛠️ Installation

```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env

# Démarrer le serveur
npm start
```

## 📦 Scripts Disponibles

- `npm start` - Démarre le serveur
- `npm run dev` - Mode développement avec nodemon  
- `npm run build` - Compile TypeScript
- `npm run import-countries` - Importe les pays en base

## 🌍 Variables d'Environnement

```env
PORT=5005
MONGODB_URI=mongodb://localhost:27017/your_database
OPENAI_API_KEY=your_openai_api_key
COUNTRIES_API_URL=https://v25gigsmanualcreationbackend-production.up.railway.app/api/countries
REP_URL=/api/timezones
```

## 🤖 Intelligence AI

Le système utilise OpenAI pour détecter intelligemment :
- **Pays explicites** : "Destination zone Poland"
- **Noms multilingues** : "Autriche" → Austria
- **Références culturelles** : "pays des chocolat" → Switzerland
- **Contexte business** : Entreprises françaises → France