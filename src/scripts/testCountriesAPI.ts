import mongoose from 'mongoose';
import { Country } from '../models/countryModel';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

async function testCountriesAPI() {
  try {
    // Connexion à MongoDB
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('✅ Connecté à MongoDB');

    // Test 1: Compter les pays
    const totalCount = await Country.countDocuments();
    console.log(`📊 Total de pays en base: ${totalCount}`);

    // Test 2: Récupérer quelques pays
    const sampleCountries = await Country.find().limit(5);
    console.log('\n📋 Échantillon de pays:');
    sampleCountries.forEach(country => {
      console.log(`  - ${country.name.common} (${country.cca2})`);
    });

    // Test 3: Rechercher un pays spécifique
    const jamaica = await Country.findOne({ cca2: 'JM' });
    if (jamaica) {
      console.log('\n🇯🇲 Test Jamaica:');
      console.log(`  - Nom commun: ${jamaica.name.common}`);
      console.log(`  - Nom officiel: ${jamaica.name.official}`);
      console.log(`  - Code: ${jamaica.cca2}`);
      if (jamaica.flags?.png) {
        console.log(`  - Drapeau: ${jamaica.flags.png}`);
      }
    }

    // Test 4: Rechercher par nom
    const searchResults = await Country.find({
      'name.common': { $regex: 'France', $options: 'i' }
    });
    console.log(`\n🔍 Recherche "France": ${searchResults.length} résultat(s)`);
    searchResults.forEach(country => {
      console.log(`  - ${country.name.common} (${country.cca2})`);
    });

    console.log('\n✅ Tous les tests API sont passés !');

  } catch (error: any) {
    console.error('❌ Erreur lors des tests:', error.message);
  } finally {
    // Fermer la connexion MongoDB
    await mongoose.disconnect();
    console.log('🔌 Connexion MongoDB fermée');
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  testCountriesAPI();
}

export default testCountriesAPI;
