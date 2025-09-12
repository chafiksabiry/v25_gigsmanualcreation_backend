import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { Country } from '../models/countryModel';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

interface CountryData {
  countries: Array<{
    name: {
      common: string;
      official: string;
      nativeName: {
        [key: string]: {
          official: string;
          common: string;
        };
      };
    };
    cca2: string;
    flags?: {
      png?: string;
      svg?: string;
      alt?: string;
    };
  }>;
}

async function importCountries() {
  try {
    // Connexion à MongoDB
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('✅ Connecté à MongoDB');

    // Lire le fichier countries.json
    const countriesPath = path.join(__dirname, '../countries.json');
    const countriesData: CountryData = JSON.parse(fs.readFileSync(countriesPath, 'utf8'));
    
    console.log(`📊 Trouvé ${countriesData.countries.length} pays à importer`);

    // Vérifier combien de pays existent déjà
    const existingCount = await Country.countDocuments();
    console.log(`📋 ${existingCount} pays déjà en base`);

    if (existingCount > 0) {
      console.log('⚠️  Des pays existent déjà. Voulez-vous continuer ? (Cela peut créer des doublons)');
      // En production, vous pourriez ajouter une confirmation ici
    }

    // Filtrer et valider les pays
    const validCountries = [];
    const invalidCountries = [];

    for (let i = 0; i < countriesData.countries.length; i++) {
      const country = countriesData.countries[i];
      
      // Vérifier les champs requis
      if (!country || 
          !country.name || 
          !country.name.common || 
          !country.name.official || 
          !country.cca2) {
        invalidCountries.push({
          index: i,
          data: country,
          error: 'Missing required fields: name.common, name.official, or cca2'
        });
        continue;
      }

      // Vérifier si le pays existe déjà
      const existingCountry = await Country.findOne({ cca2: country.cca2.toUpperCase() });
      if (existingCountry) {
        console.log(`⚠️  Pays ${country.name.common} (${country.cca2}) existe déjà - ignoré`);
        continue;
      }

      // Normaliser le code CCA2
      const normalizedCountry = {
        ...country,
        cca2: country.cca2.toUpperCase()
      };

      validCountries.push(normalizedCountry);
    }

    if (validCountries.length === 0) {
      console.log('❌ Aucun pays valide à importer');
      return;
    }

    console.log(`📥 Import de ${validCountries.length} pays...`);

    // Insérer les pays par batch pour éviter les problèmes de mémoire
    const batchSize = 50;
    let importedCount = 0;

    for (let i = 0; i < validCountries.length; i += batchSize) {
      const batch = validCountries.slice(i, i + batchSize);
      
      try {
        const result = await Country.insertMany(batch, { ordered: false });
        importedCount += result.length;
        console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${result.length} pays importés`);
      } catch (error: any) {
        if (error.name === 'BulkWriteError') {
          importedCount += error.result.insertedCount;
          console.log(`⚠️  Batch ${Math.floor(i/batchSize) + 1}: ${error.result.insertedCount} pays importés, ${error.writeErrors.length} erreurs`);
        } else {
          console.error(`❌ Erreur batch ${Math.floor(i/batchSize) + 1}:`, error.message);
        }
      }
    }

    console.log(`\n🎉 Import terminé !`);
    console.log(`✅ ${importedCount} pays importés avec succès`);
    if (invalidCountries.length > 0) {
      console.log(`⚠️  ${invalidCountries.length} pays ignorés (données invalides)`);
    }

    // Statistiques finales
    const finalCount = await Country.countDocuments();
    console.log(`📊 Total en base: ${finalCount} pays`);

  } catch (error: any) {
    console.error('❌ Erreur lors de l\'importation:', error.message);
  } finally {
    // Fermer la connexion MongoDB
    await mongoose.disconnect();
    console.log('🔌 Connexion MongoDB fermée');
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  importCountries();
}

export default importCountries;
