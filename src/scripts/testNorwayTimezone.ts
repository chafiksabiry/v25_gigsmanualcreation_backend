import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { AIService } from '../services/aiService';

// Charger les variables d'environnement
dotenv.config();

async function testNorwayTimezoneDetection() {
  try {
    console.log('🧪 Test de détection timezone Norway...\n');

    // Se connecter à MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/test';
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB\n');

    // Description de test avec Norway
    const testDescription = `🚨 GIG À SAISIR – VENTE DE MUTUELLES SANTÉ PARTENAIRES 💼💬

Tu sais convaincre, écouter et conclure ?
Rejoins notre équipe commerciale HARX pour vendre les mutuelles santé de nos partenaires de confiance (APRIL, SPVIE, ALPTIS, etc.).

🎯 Ta mission :
- Contacter les prospects (base fournie).
- Leur proposer la couverture santé la plus adaptée à leur profil.

💰 Ta rémunération (au succès) :
- 25 € par rendez-vous qualifié.
- Jusqu'à 150 € par contrat signé.
- BONUS si tu dépasses tes objectifs 💸.
- Primes collectives en équipe 🔥.

🛠️ Nous te donnons tout pour réussir :
- Script solide + base de contacts chaude.
- Formation rapide et accompagnement par nos managers.
- Argumentaires partenaires prêts à l'emploi.
- Coaching en direct et suivi de performances.

✅ Tu es fait(e) pour ce GIG si :
- Tu as de la tchatche et une bonne capacité d'écoute.
- Tu sais t'adapter à chaque profil.
- Tu veux des résultats rapides et concrets.
- Tu peux t'engager quelques heures par jour.

📆 Disponibilités demandées :
- Lundi et mardi : 8h00 – 12h40.
- Autres jours : 9h00 – 15h45.

🚀 Lancement immédiat – équipe en cours de sélection. Ne rate pas ta place !, je veux le time zone et destination zone de Norway`;

    console.log('📝 Description de test:');
    console.log(testDescription);
    console.log('\n' + '='.repeat(80) + '\n');

    // Mock timezones data
    const mockTimezonesData = [
      {
        _id: '6862a4d035d179cc0b4ecea5',
        zoneName: 'Europe/Paris',
        countryName: 'France'
      },
      {
        _id: '6862a4d035d179cc0b4ecNOR',
        zoneName: 'Europe/Oslo',
        countryName: 'Norway'
      }
    ];

    // Test de la méthode de détection contextuelle
    const contextualTimezone = (AIService as any).getContextualTimezone(testDescription, mockTimezonesData);
    console.log(`🎯 Timezone contextuelle détectée: "${contextualTimezone}"`);

    // Test de la méthode findTimezoneId complète
    const timezoneId = (AIService as any).findTimezoneId('Europe/Oslo', mockTimezonesData, testDescription);
    console.log(`🆔 ID timezone pour Europe/Oslo: "${timezoneId}"`);

    // Test de la devise associée
    const currency = (AIService as any).getCurrencyFromTimezone('Europe/Oslo');
    console.log(`💰 Devise pour Europe/Oslo: "${currency}"`);

    // Test avec le contexte complet
    const fullContext = `${testDescription} Norway timezone`;
    const contextTimezone = (AIService as any).getContextualTimezone(fullContext, mockTimezonesData);
    console.log(`🌍 Timezone avec contexte complet: "${contextTimezone}"`);

    if (contextTimezone === '6862a4d035d179cc0b4ecNOR' || contextTimezone?.includes('Oslo')) {
      console.log('✅ SUCCESS: Norway timezone correctement détectée !');
    } else if (contextTimezone === '6862a4d035d179cc0b4ecea5' || contextTimezone?.includes('Paris')) {
      console.log('❌ ERREUR: France timezone détectée au lieu de Norway');
    } else {
      console.log('❓ RÉSULTAT: Timezone inattendue ou non trouvée');
    }

  } catch (error: any) {
    console.error('❌ Erreur lors du test:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté de MongoDB');
  }
}

// Lancer le test
testNorwayTimezoneDetection();
