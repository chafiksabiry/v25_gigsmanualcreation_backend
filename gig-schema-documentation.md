# 📋 Schéma du Modèle Gig - Documentation Complète

## 🏷️ **Informations Générales**

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `title` | String | ❌ | Titre du gig |
| `description` | String | ❌ | Description détaillée du gig |
| `category` | String | ❌ | Catégorie du gig |
| `userId` | ObjectId | ❌ | Référence vers l'utilisateur (User) |
| `companyId` | ObjectId | ❌ | Référence vers l'entreprise (Company) |
| `status` | Enum | ✅ | Statut du gig |

### Status (Énumération)
```
'to_activate' | 'active' | 'inactive' | 'archived'
```
**Défaut :** `'to_activate'`

---

## 🌍 **Zones et Secteurs**

| Champ | Type | Requis | Référence | Description |
|-------|------|--------|-----------|-------------|
| `destination_zone` | ObjectId | ❌ | Country | Zone de destination |
| `sectors` | [ObjectId] | ❌ | Sector | Secteurs d'activité |
| `activities` | [ObjectId] | ❌ | Activity | Activités spécifiques |
| `industries` | [ObjectId] | ❌ | Industry | Industries concernées |

---

## 👤 **Séniorité**

```typescript
seniority: {
  level: String,              // Niveau (Junior, Senior, Expert, etc.)
  yearsExperience: String     // Années d'expérience requises
}
```

---

## 🎯 **Compétences (Skills)**

### Professional Skills
```typescript
skills.professional: [{
  skill: ObjectId,            // Référence vers ProfessionalSkill
  level: Number,              // Niveau de compétence (1-5)
  details: String             // Détails supplémentaires
}]
```

### Technical Skills
```typescript
skills.technical: [{
  skill: ObjectId,            // Référence vers TechnicalSkill
  level: Number,              // Niveau de compétence (1-5)
  details: String             // Détails supplémentaires
}]
```

### Soft Skills
```typescript
skills.soft: [{
  skill: ObjectId,            // Référence vers SoftSkill
  level: Number,              // Niveau de compétence (1-5)
  details: String             // Détails supplémentaires
}]
```

### Languages
```typescript
skills.languages: [{
  language: ObjectId,         // Référence vers Language
  proficiency: String,        // Niveau (A1, A2, B1, B2, C1, C2)
  iso639_1: String           // Code ISO langue (fr, en, es, etc.)
}]
```

---

## ⏰ **Disponibilité (Availability)**

### Schedule (Horaires)
```typescript
availability.schedule: [{
  day: String,                // Jour de la semaine
  hours: {
    start: String,            // Heure de début (ex: "09:00")
    end: String               // Heure de fin (ex: "17:00")
  }
}]
```

### Autres Champs
| Champ | Type | Référence | Description |
|-------|------|-----------|-------------|
| `time_zone` | ObjectId | Timezone | Fuseau horaire |
| `flexibility` | [String] | - | Options de flexibilité |

### Minimum Hours
```typescript
availability.minimumHours: {
  daily?: Number,             // Heures minimum par jour
  weekly?: Number,            // Heures minimum par semaine
  monthly?: Number            // Heures minimum par mois
}
```

---

## 💰 **Commission (Structure Complexe)**

### Champs de Base
| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `base` | String | ❌ | Type de commission de base |
| `baseAmount` | String | ❌ | Montant de la commission de base |
| `bonus` | String | ❌ | Type de bonus |
| `bonusAmount` | String | ❌ | Montant du bonus |
| `structure` | String | ❌ | Structure de commission |
| `currency` | ObjectId | ❌ | Devise (référence vers Currency) |
| `additionalDetails` | String | ❌ | Détails supplémentaires |

### Minimum Volume (Volume Minimum)
```typescript
commission.minimumVolume: {
  amount: String,             // Quantité minimum (ex: "25")
  period: String,             // Période (ex: "Monthly", "Weekly")
  unit: String                // Unité (ex: "Calls", "Leads", "Sales")
}
```

**Exemple :**
```json
{
  "amount": "25",
  "period": "Monthly", 
  "unit": "Calls"
}
```
→ *"25 appels minimum par mois pour toucher la commission"*

### Transaction Commission
```typescript
commission.transactionCommission?: {
  type: String,               // Type de commission par transaction
  amount: String              // Montant par transaction
}
```

---

## 🎯 **Leads**

### Types de Leads
```typescript
leads.types: [{
  type: 'hot' | 'warm' | 'cold',    // Type de lead (énumération)
  percentage: Number,               // Pourcentage attendu
  description: String,              // Description du type
  conversionRate?: Number           // Taux de conversion (optionnel)
}]
```

### Sources
```typescript
leads.sources: [String]             // Sources des leads
```

---

## 👥 **Équipe (Team)**

### Structure d'Équipe
```typescript
team.structure: [{
  roleId: String,             // Identifiant du rôle
  count: Number,              // Nombre de personnes
  seniority: {
    level: String,            // Niveau de séniorité
    yearsExperience: String   // Années d'expérience
  }
}]
```

### Autres Champs
| Champ | Type | Référence | Description |
|-------|------|-----------|-------------|
| `size` | String | - | Taille de l'équipe |
| `territories` | [ObjectId] | Country | Territoires couverts |

---

## 📚 **Documentation**

### Types de Documentation
```typescript
documentation: {
  product?: [{
    name: String,             // Nom du document
    url: String               // URL du document
  }],
  process?: [{
    name: String,             // Nom du processus
    url: String               // URL de la documentation
  }],
  training?: [{
    name: String,             // Nom de la formation
    url: String               // URL de la formation
  }]
}
```

---

## ✨ **Highlights & Deliverables**

| Champ | Type | Description |
|-------|------|-------------|
| `highlights` | [String] | Points forts du gig |
| `deliverables` | [String] | Livrables attendus |

---

## 📅 **Timestamps**

| Champ | Type | Auto | Description |
|-------|------|------|-------------|
| `createdAt` | Date | ✅ | Date de création |
| `updatedAt` | Date | ✅ | Date de dernière modification |

---

## 🔗 **Références (Populate Automatique)**

Les champs suivants sont automatiquement populés avec leurs données complètes :

| Champ | Modèle Référencé | Description |
|-------|------------------|-------------|
| `sectors` | Sector | Données complètes des secteurs |
| `activities` | Activity | Données complètes des activités |
| `industries` | Industry | Données complètes des industries |
| `destination_zone` | Country | Données complètes du pays |
| `availability.time_zone` | Timezone | Données complètes du fuseau horaire |
| `commission.currency` | Currency | Données complètes de la devise |
| `team.territories` | Country | Données complètes des territoires |
| `skills.*.skill` | *Skill | Données complètes des compétences |
| `skills.languages.language` | Language | Données complètes des langues |

---

## 📊 **Exemple Complet**

```json
{
  "_id": "64a7b8c9d1e2f3a4b5c6d7e8",
  "title": "Commercial Outbound - Assurance",
  "description": "Mission de prospection commerciale dans l'assurance",
  "category": "Sales",
  "status": "active",
  "destination_zone": {
    "name": { "common": "France" },
    "cca2": "FR"
  },
  "sectors": [
    { "name": "Outbound Sales", "description": "Vente sortante" }
  ],
  "activities": [
    { "name": "Order Taking", "description": "Prise de commandes" }
  ],
  "industries": [
    { "name": "Insurance", "description": "Secteur de l'assurance" }
  ],
  "commission": {
    "base": "Fixed",
    "baseAmount": "2000",
    "currency": {
      "code": "EUR",
      "name": "Euro",
      "symbol": "€"
    },
    "minimumVolume": {
      "amount": "25",
      "period": "Monthly",
      "unit": "Calls"
    }
  },
  "availability": {
    "time_zone": {
      "name": "Europe/Paris",
      "offset": "+01:00"
    }
  },
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

## 🚀 **Endpoints Utilisant ce Schéma**

- `GET /api/gigs` - Tous les gigs avec populate
- `GET /api/gigs/active` - Gigs actifs avec populate  
- `GET /api/gigs/:id` - Gig spécifique avec populate
- `GET /api/gigs/user/:userId` - Gigs par utilisateur avec populate
- `GET /api/gigs/company/:companyId` - Gigs par entreprise avec populate
- `POST /api/gigs` - Créer un nouveau gig
- `PUT /api/gigs/:id` - Modifier un gig

---

*📝 Document généré automatiquement - Version 1.0*
