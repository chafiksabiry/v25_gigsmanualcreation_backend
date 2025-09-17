import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Currency } from '../models/currencyModel';

// Charger les variables d'environnement
dotenv.config();

async function checkCurrencies() {
  try {
    console.log('🔍 Checking currencies in database...');

    // Connexion à MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/gigs';
    console.log(`🔗 Connecting to: ${mongoUri}`);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Vérifier le nombre total de devises
    const totalCount = await Currency.countDocuments();
    console.log(`📊 Total currencies in database: ${totalCount}`);

    // Vérifier les devises actives
    const activeCount = await Currency.countDocuments({ isActive: true });
    console.log(`🟢 Active currencies: ${activeCount}`);

    // Vérifier les devises inactives
    const inactiveCount = await Currency.countDocuments({ isActive: false });
    console.log(`🔴 Inactive currencies: ${inactiveCount}`);

    // Afficher quelques exemples
    if (totalCount > 0) {
      console.log('\n📋 Sample currencies:');
      const sampleCurrencies = await Currency.find().limit(10).lean();
      sampleCurrencies.forEach(currency => {
        console.log(`  ${currency.code} - ${currency.name} (${currency.symbol}) - Active: ${currency.isActive}`);
      });
    } else {
      console.log('❌ No currencies found in database!');
    }

    // Vérifier la collection
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📂 Available collections:');
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });

    // Vérifier spécifiquement la collection currencies
    const currenciesCollectionExists = collections.some(col => col.name === 'currencies');
    console.log(`\n💾 Currencies collection exists: ${currenciesCollectionExists}`);

    if (currenciesCollectionExists) {
      const stats = await mongoose.connection.db.collection('currencies').stats();
      console.log(`📈 Collection stats: ${stats.count} documents, ${Math.round(stats.size / 1024)}KB`);
    }

  } catch (error: any) {
    console.error('❌ Error checking currencies:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Fermer la connexion MongoDB
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  checkCurrencies();
}

export { checkCurrencies };
