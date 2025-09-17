# Currency API Documentation

## Overview
Cette API permet de gérer les devises (currencies) avec des fonctionnalités CRUD complètes et l'importation automatique depuis le fichier `currencies.json`.

## Base URL
```
/api/currencies
```

## Endpoints

### 1. Récupérer toutes les devises
**GET** `/api/currencies`

**Query Parameters:**
- `search` (string, optional): Recherche par code ou nom de devise
- `isActive` (boolean, optional): Filtrer par statut actif/inactif
- `paginated` (boolean, optional): Si `true`, active la pagination
- `page` (number, optional): Numéro de page (seulement si `paginated=true`)
- `limit` (number, optional): Nombre d'éléments par page (seulement si `paginated=true`, max: 200)

#### Par défaut (toutes les devises sans pagination):
**URL:** `/api/currencies`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "code": "EUR",
      "name": "Euro",
      "symbol": "€",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
    // ... toutes les 162 devises
  ],
  "total": 162,
  "message": "All currencies retrieved successfully"
}
```

#### Avec pagination (si explicitement demandée):
**URL:** `/api/currencies?paginated=true&page=1&limit=50`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "code": "EUR",
      "name": "Euro",
      "symbol": "€",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 162,
    "pages": 4
  },
  "message": "Currencies retrieved successfully"
}
```

### 2. Récupérer une devise par code
**GET** `/api/currencies/:code`

**Parameters:**
- `code` (string): Code de la devise (ex: EUR, USD, MAD)

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "code": "EUR",
    "name": "Euro",
    "symbol": "€",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Currency retrieved successfully"
}
```

### 3. Créer une nouvelle devise
**POST** `/api/currencies`

**Body:**
```json
{
  "code": "TEST",
  "name": "Test Currency",
  "symbol": "T$",
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "code": "TEST",
    "name": "Test Currency",
    "symbol": "T$",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Currency created successfully"
}
```

### 4. Mettre à jour une devise
**PUT** `/api/currencies/:code`

**Parameters:**
- `code` (string): Code de la devise à mettre à jour

**Body:**
```json
{
  "name": "Updated Currency Name",
  "symbol": "U$",
  "isActive": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "code": "TEST",
    "name": "Updated Currency Name",
    "symbol": "U$",
    "isActive": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Currency updated successfully"
}
```

### 5. Supprimer une devise (soft delete)
**DELETE** `/api/currencies/:code`

**Parameters:**
- `code` (string): Code de la devise à supprimer

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "code": "TEST",
    "name": "Test Currency",
    "symbol": "T$",
    "isActive": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Currency deactivated successfully"
}
```

### 6. Statistiques des devises
**GET** `/api/currencies/stats`

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 168,
    "active": 165,
    "inactive": 3,
    "topSymbols": [
      {
        "_id": "$",
        "count": 25,
        "currencies": ["USD", "CAD", "AUD", "..."]
      },
      {
        "_id": "€",
        "count": 19,
        "currencies": ["EUR"]
      }
    ]
  },
  "message": "Currency statistics retrieved successfully"
}
```

### 7. Importer les devises depuis currencies.json
**POST** `/api/currencies/seed`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalFound": 168,
    "created": 150,
    "updated": 18,
    "errors": 0
  },
  "message": "Seed completed: 150 created, 18 updated, 0 errors"
}
```

## Scripts NPM

### Importer les devises
```bash
npm run seed-currencies
```
Ce script lit le fichier `currencies.json` et importe toutes les devises dans la base de données.

### Tester l'API
```bash
npm run test-currencies
```
Ce script teste tous les endpoints de l'API des devises.

## Modèle de données

### Currency Schema
```typescript
{
  code: string,        // Code ISO 4217 (3 caractères, unique)
  name: string,        // Nom complet de la devise
  symbol: string,      // Symbole de la devise
  isActive: boolean,   // Statut actif/inactif (défaut: true)
  createdAt: Date,     // Date de création
  updatedAt: Date      // Date de dernière mise à jour
}
```

## Exemples de devises

| Code | Nom | Symbole |
|------|-----|---------|
| EUR | Euro | € |
| USD | United States dollar | $ |
| MAD | Moroccan dirham | د.م. |
| GBP | British pound | £ |
| JPY | Japanese yen | ¥ |

## Codes d'erreur

- `400` - Bad Request: Paramètres manquants ou invalides
- `404` - Not Found: Devise non trouvée
- `409` - Conflict: Devise existe déjà (lors de la création)
- `500` - Internal Server Error: Erreur serveur

## Notes importantes

1. **Codes de devise**: Tous les codes sont automatiquement convertis en majuscules
2. **Soft Delete**: La suppression désactive la devise (isActive: false) au lieu de la supprimer physiquement
3. **Pagination**: Par défaut, 50 éléments par page, maximum 100
4. **Recherche**: Insensible à la casse, recherche dans le code et le nom
5. **Unicité**: Le code de devise doit être unique dans la base de données
