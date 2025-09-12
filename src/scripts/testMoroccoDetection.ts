import mongoose from 'mongoose';
import { Country } from '../models/countryModel';
import { AIService } from '../services/aiService';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

async function testMoroccoDetection() {
  try {
    // Connexion à MongoDB
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('✅ Connecté à MongoDB');

    // Récupérer les pays depuis la base
    const countries = await Country.find().lean();
    console.log(`📊 ${countries.length} pays récupérés`);

    // Vérifier si le Maroc existe dans la base
    const morocco = countries.find(c => c.cca2 === 'MA');
    if (morocco) {
      console.log(`✅ Maroc trouvé en base: ${morocco.name.common} (${morocco.cca2})`);
    } else {
      console.log('❌ Maroc non trouvé en base !');
      return;
    }

    // Test de la fonction findCountryCode
    console.log('\n🧪 Test de détection des pays:');
    const testCases = [
      'Morocco',
      'morocco',
      'Maroc',
      'maroc',
      'MA',
      'ma',
      'Africa/Casablanca',
      'time zone de Morocco'
    ];

    for (const testCase of testCases) {
      // Utiliser la réflection pour accéder à la méthode privée
      const result = (AIService as any).findCountryCode(testCase, countries);
      const status = result === 'MA' ? '✅' : '❌';
      console.log(`   ${status} "${testCase}" → "${result}"`);
    }

    // Test avec la description réelle
    console.log('\n🧪 Test avec description complète:');
    const description = `🚨 GIG À SAISIR – VENTE DE MUTUELLES SANTÉ PARTENAIRES 💼💬

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

🚀 Lancement immédiat – équipe en cours de sélection. Ne rate pas ta place !, je veux le time zone de Morocco`;

    // Mock data minimal pour le test
    const mockData = {
      activities: [{ _id: '1', name: 'Sales' }],
      industries: [{ _id: '1', name: 'Insurance' }],
      languages: [{ _id: '1', name: 'French', iso639_1: 'fr' }],
      skills: { soft: [], professional: [], technical: [] },
      timezones: [{ _id: '1', zoneName: 'Africa/Casablanca', countryName: 'Morocco', gmtOffset: 0 }]
    };

    try {
      console.log('🤖 Test de génération AI...');
      const result = await AIService.generateGigSuggestions(
        description,
        mockData.activities,
        mockData.industries,
        mockData.languages,
        mockData.skills,
        mockData.timezones,
        countries
      );

      console.log(`📍 Destination zone générée: ${result.destination_zone}`);
      
      if (result.destination_zone === 'MA') {
        console.log('✅ SUCCESS: Maroc correctement détecté !');
      } else {
        console.log(`❌ ÉCHEC: Attendu "MA", reçu "${result.destination_zone}"`);
      }

    } catch (error: any) {
      console.error('❌ Erreur génération AI:', error.message);
    }

  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Connexion fermée');
  }
}

if (require.main === module) {
  testMoroccoDetection();
}

export default testMoroccoDetection;
