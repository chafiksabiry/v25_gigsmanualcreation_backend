import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { AIService } from '../services/aiService';

// Charger les variables d'environnement
dotenv.config();

async function testSimpleCountryDetection() {
  try {
    console.log('🧪 Test de détection simple des pays (même logique que timezones)...\n');

    // Se connecter à MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/test';
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB\n');

    // Test avec différentes descriptions
    const testCases = [
      {
        name: "Turkey explicit",
        description: "je veux le time zone de mouzambique et destination zone turkey",
        expected: "Turkey"
      },
      {
        name: "Norway explicit", 
        description: "je veux le time zone et destination zone de Norway",
        expected: "Norway"
      },
      {
        name: "France context",
        description: "Rejoins notre équipe HARX pour vendre les mutuelles APRIL, SPVIE",
        expected: "" // Pas de mention explicite de pays
      },
      {
        name: "Morocco in text",
        description: "Travail au Morocco pour notre entreprise",
        expected: "Morocco"
      },
      {
        name: "Multiple countries",
        description: "Nous travaillons en France et en Turkey",
        expected: "France" // Premier trouvé
      }
    ];

    // Mock countries data (simplifié)
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
        _id: '68c381ebf614d167d2c05NOR',
        name: {
          common: 'Norway',
          official: 'Kingdom of Norway',
          nativeName: {
            nno: { official: 'Kongeriket Noreg', common: 'Noreg' },
            nob: { official: 'Kongeriket Norge', common: 'Norge' }
          }
        },
        cca2: 'NO'
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
      },
      {
        _id: '68c381ebf614d167d2c05MAR',
        name: {
          common: 'Morocco',
          official: 'Kingdom of Morocco',
          nativeName: {
            ara: { official: 'المملكة المغربية', common: 'المغرب' },
            ber: { official: 'ⵜⴰⴳⵍⴷⵉⵜ ⵏ ⵍⵎⵖⵔⵉⵇ', common: 'ⵍⵎⵖⵔⵉⵇ' },
            fra: { official: 'Royaume du Maroc', common: 'Maroc' }
          }
        },
        cca2: 'MA'
      }
    ];

    console.log('📋 Tests de détection simple:\n');

    for (const testCase of testCases) {
      console.log(`🧪 Test: ${testCase.name}`);
      console.log(`📝 Description: "${testCase.description}"`);
      console.log(`🎯 Attendu: "${testCase.expected}"`);
      
      const detectedCountry = (AIService as any).analyzeDescriptionForCountry(testCase.description, mockCountriesData);
      console.log(`🔍 Détecté: "${detectedCountry}"`);
      
      if (detectedCountry === testCase.expected) {
        console.log('✅ SUCCESS\n');
      } else {
        console.log(`❌ ÉCHEC (attendu: "${testCase.expected}", obtenu: "${detectedCountry}")\n`);
      }
    }

    // Test spécifique pour Turkey
    console.log('🔍 TEST SPÉCIFIQUE TURKEY:');
    const turkeyDescription = "je veux le time zone de mouzambique et destination zone turkey";
    const turkeyResult = (AIService as any).analyzeDescriptionForCountry(turkeyDescription, mockCountriesData);
    
    if (turkeyResult === "Turkey") {
      const countryId = (AIService as any).findCountryId(turkeyResult, mockCountriesData, turkeyDescription);
      console.log(`✅ Turkey détecté et converti en ID: ${countryId}`);
    } else {
      console.log(`❌ Turkey non détecté, résultat: "${turkeyResult}"`);
    }

  } catch (error: any) {
    console.error('❌ Erreur lors du test:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté de MongoDB');
  }
}

// Lancer le test
testSimpleCountryDetection();
