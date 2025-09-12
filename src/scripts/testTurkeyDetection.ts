import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { AIService } from '../services/aiService';

// Charger les variables d'environnement
dotenv.config();

async function testTurkeyDetection() {
  try {
    console.log('🧪 Test de détection de Turkey...\n');

    // Se connecter à MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/test';
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB\n');

    // Description de test avec Turkey
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

🚀 Lancement immédiat – équipe en cours de sélection. Ne rate pas ta place !, je veux le time zone de mouzambique et destination zone turkey`;

    console.log('📝 Description de test:');
    console.log(testDescription);
    console.log('\n' + '='.repeat(80) + '\n');

    // Test avec des données de pays mock
    const mockCountriesData = [
      {
        _id: '68c381ebf614d167d2c05TUR',
        name: {
          common: 'Turkey',
          official: 'Republic of Turkey',
          nativeName: {
            tur: { official: 'Türkiye Cumhuriyeti', common: 'Türkiye' }
          }
        },
        cca2: 'TR'
      },
      {
        _id: '68c381ebf614d167d2c057c8',
        name: {
          common: 'Albania',
          official: 'Republic of Albania',
          nativeName: {
            sqi: { official: 'Republika e Shqipërisë', common: 'Shqipëria' }
          }
        },
        cca2: 'AL'
      },
      {
        _id: '68c381ebf614d167d2c05785',
        name: {
          common: 'France',
          official: 'French Republic',
          nativeName: {
            fra: { official: 'République française', common: 'France' }
          }
        },
        cca2: 'FR'
      }
    ];

    // Test de la méthode d'analyse avec les données de l'API
    const detectedCountry = (AIService as any).analyzeDescriptionForCountry(testDescription, mockCountriesData);
    console.log(`🎯 Pays détecté par l'analyse: "${detectedCountry}"`);

    if (detectedCountry) {
      const countryId = (AIService as any).findCountryId(detectedCountry, mockCountriesData, testDescription);
      console.log(`🆔 ID MongoDB du pays: "${countryId}"`);
      
      if (countryId === '68c381ebf614d167d2c05TUR') {
        console.log('✅ SUCCESS: Turkey correctement détecté et converti en ID !');
      } else if (countryId === '68c381ebf614d167d2c057c8') {
        console.log('❌ ERREUR: Albania détecté au lieu de Turkey');
      } else if (countryId === '68c381ebf614d167d2c05785') {
        console.log('❌ ERREUR: France détecté au lieu de Turkey');
      } else {
        console.log(`❓ RÉSULTAT: ID inattendu "${countryId}"`);
      }
    } else {
      console.log('❌ ERREUR: Aucun pays détecté dans la description');
    }

    // Test spécifique du pattern regex
    console.log('\n🔍 TEST PATTERN REGEX:');
    const pattern = /(?:destination\s*zone?)\s+([a-z\s]+?)(?:\s|$|[,.!?])/gi;
    const matches = [...testDescription.toLowerCase().matchAll(pattern)];
    console.log(`Matches trouvés: ${matches.length}`);
    matches.forEach((match, index) => {
      console.log(`  Match ${index + 1}: "${match[1]}"`);
    });

  } catch (error: any) {
    console.error('❌ Erreur lors du test:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté de MongoDB');
  }
}

// Lancer le test
testTurkeyDetection();
