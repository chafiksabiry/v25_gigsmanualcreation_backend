import mongoose from 'mongoose';
import { Country } from '../models/countryModel';
import { AIService } from '../services/aiService';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Mock data pour les tests
const mockActivities = [
  { _id: '1', name: 'Sales', description: 'Sales activities' },
  { _id: '2', name: 'Customer Service', description: 'Customer service activities' }
];

const mockIndustries = [
  { _id: '1', name: 'Insurance', description: 'Insurance industry' },
  { _id: '2', name: 'Technology', description: 'Technology industry' }
];

const mockLanguages = [
  { _id: '1', name: 'English', iso639_1: 'en' },
  { _id: '2', name: 'French', iso639_1: 'fr' }
];

const mockSkills = {
  soft: [{ _id: '1', name: 'Communication' }],
  professional: [{ _id: '1', name: 'Sales Experience' }],
  technical: [{ _id: '1', name: 'CRM Software' }]
};

const mockTimezones = [
  { _id: '1', zoneName: 'Europe/Paris', countryName: 'France', gmtOffset: 1 },
  { _id: '2', zoneName: 'America/New_York', countryName: 'United States', gmtOffset: -5 }
];

async function testAIGeneration() {
  try {
    // Connexion à MongoDB
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('✅ Connecté à MongoDB');

    // Récupérer quelques pays depuis la base
    const countries = await Country.find().limit(10).lean();
    console.log(`📊 ${countries.length} pays récupérés pour les tests`);

    // Test 1: Description en français
    console.log('\n🧪 Test 1: Description en français');
    try {
      const frenchResult = await AIService.generateGigSuggestions(
        "Nous recherchons un agent commercial pour vendre des assurances santé en France",
        mockActivities,
        mockIndustries,
        mockLanguages,
        mockSkills,
        mockTimezones,
        countries
      );
      
      console.log('✅ Génération française réussie');
      console.log(`   - Destination zone: ${frenchResult.destination_zone} (doit être un code pays)`);
      console.log(`   - Titre: ${frenchResult.title}`);
    } catch (error: any) {
      console.error('❌ Erreur génération française:', error.message);
    }

    // Test 2: Description en anglais
    console.log('\n🧪 Test 2: Description en anglais');
    try {
      const englishResult = await AIService.generateGigSuggestions(
        "We are looking for a sales representative to sell health insurance in Morocco",
        mockActivities,
        mockIndustries,
        mockLanguages,
        mockSkills,
        mockTimezones,
        countries
      );
      
      console.log('✅ Génération anglaise réussie');
      console.log(`   - Destination zone: ${englishResult.destination_zone} (doit être un code pays)`);
      console.log(`   - Titre: ${englishResult.title}`);
    } catch (error: any) {
      console.error('❌ Erreur génération anglaise:', error.message);
    }

    // Test 3: Vérifier que les codes pays sont valides
    console.log('\n🧪 Test 3: Validation des codes pays');
    const testCodes = ['france', 'morocco', 'united states', 'FR', 'MA', 'US'];
    
    for (const testCode of testCodes) {
      // Utiliser la méthode privée via réflection pour les tests
      const result = (AIService as any).findCountryCode(testCode, countries);
      console.log(`   - "${testCode}" → "${result}"`);
    }

    console.log('\n✅ Tous les tests AI sont terminés !');

  } catch (error: any) {
    console.error('❌ Erreur lors des tests AI:', error.message);
  } finally {
    // Fermer la connexion MongoDB
    await mongoose.disconnect();
    console.log('🔌 Connexion MongoDB fermée');
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  testAIGeneration();
}

export default testAIGeneration;
