import mongoose from 'mongoose';
import { Country } from '../models/countryModel';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

async function cleanCountries() {
  try {
    // Connexion à MongoDB
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('✅ Connecté à MongoDB');

    // Vérifier les collections existantes
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Base de données non connectée');
    }
    
    const collections = await db.listCollections().toArray();
    console.log('📋 Collections existantes:', collections.map(c => c.name));

    // Supprimer la collection countries si elle existe
    const collectionExists = collections.some(c => c.name === 'countries');
    
    if (collectionExists) {
      console.log('🗑️  Suppression de la collection countries existante...');
      await db.dropCollection('countries');
      console.log('✅ Collection countries supprimée');
    } else {
      console.log('ℹ️  Aucune collection countries existante');
    }

    // Vérifier les index existants
    try {
      const indexes = await Country.collection.getIndexes();
      console.log('📊 Index existants:', Object.keys(indexes));
    } catch (error) {
      console.log('ℹ️  Aucun index existant (collection vide)');
    }

    // Créer la collection avec le bon schéma
    console.log('🔧 Création de la nouvelle collection...');
    await Country.createCollection();
    console.log('✅ Collection countries créée avec le bon schéma');

    console.log('\n🎉 Nettoyage terminé ! Vous pouvez maintenant importer les pays.');

  } catch (error: any) {
    console.error('❌ Erreur lors du nettoyage:', error.message);
  } finally {
    // Fermer la connexion MongoDB
    await mongoose.disconnect();
    console.log('🔌 Connexion MongoDB fermée');
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  cleanCountries();
}

export default cleanCountries;
