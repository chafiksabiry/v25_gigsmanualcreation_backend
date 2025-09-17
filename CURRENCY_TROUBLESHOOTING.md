# Currency API - Guide de dépannage

## Problème : L'API retourne un tableau vide

Si vous obtenez cette réponse :
```json
{
    "success": true,
    "data": [],
    "pagination": {
        "page": 1,
        "limit": 50,
        "total": 0,
        "pages": 0
    },
    "message": "Currencies retrieved successfully"
}
```

## Solutions par étapes

### 1. Vérifier que MongoDB est démarré

```bash
# Démarrer MongoDB (selon votre installation)
mongod

# Ou sur Windows avec MongoDB en service
net start MongoDB
```

### 2. Vérifier la connexion MongoDB

```bash
npm run test-mongodb
```

### 3. Démarrer le serveur

```bash
npm run dev
```

Le serveur devrait afficher :
```
Connected to MongoDB
Server is running on port 5003
```

### 4. Seeder les devises via l'API

```bash
# Option 1: Via l'API REST (recommandé)
npm run seed-currencies-api

# Option 2: Directement en base de données
npm run seed-currencies
```

### 5. Vérifier que les devises sont importées

```bash
# Tester les endpoints
npm run fix-currencies

# Ou directement via curl
curl -X GET "http://localhost:5003/api/currencies/stats"
```

## Diagnostics avancés

### Vérifier la base de données directement

```bash
# Se connecter à MongoDB
mongo

# Utiliser la base de données
use gigs

# Compter les devises
db.currencies.count()

# Voir quelques exemples
db.currencies.find().limit(5)
```

### Vérifier les logs du serveur

Surveillez les logs du serveur pour :
- Erreurs de connexion MongoDB
- Erreurs lors du seeding
- Erreurs dans les contrôleurs

## Problèmes courants et solutions

### 1. MongoDB non accessible
**Erreur** : `Error connecting to MongoDB: MongoNetworkError`
**Solution** : 
- Vérifiez que MongoDB est installé et démarré
- Vérifiez l'URI de connexion dans les variables d'environnement

### 2. Collection vide après seeding
**Erreur** : Seeding réussi mais API retourne vide
**Solution** :
- Vérifiez que le bon nom de base de données est utilisé
- Vérifiez les noms de collection (doit être 'currencies')

### 3. Erreurs TypeScript
**Erreur** : `TSError: diagnosticText`
**Solution** :
- Utilisez les scripts JavaScript : `npm run seed-currencies-api`
- Ou compilez d'abord : `npm run build`

### 4. Serveur ne démarre pas
**Erreur** : Port déjà utilisé ou erreurs de dépendances
**Solution** :
- Vérifiez qu'aucun autre processus n'utilise le port 5003
- Réinstallez les dépendances : `npm install`

## Scripts disponibles

| Script | Description |
|--------|-------------|
| `npm run seed-currencies` | Seeding direct via TypeScript |
| `npm run seed-currencies-api` | Seeding via l'API REST |
| `npm run fix-currencies` | Diagnostic et réparation automatique |
| `npm run test-mongodb` | Test de connexion MongoDB |
| `npm run test-currencies` | Test complet des endpoints |

## Vérifications finales

Après résolution :

1. **Statistiques** : `GET /api/currencies/stats` devrait retourner un total > 0
2. **Liste** : `GET /api/currencies` devrait retourner des devises
3. **Recherche** : `GET /api/currencies?search=EUR` devrait trouver l'Euro
4. **Détail** : `GET /api/currencies/USD` devrait retourner le Dollar US

## Contact

Si le problème persiste, vérifiez :
- Les logs détaillés du serveur
- La configuration MongoDB
- Les variables d'environnement
- La version de Node.js et MongoDB
