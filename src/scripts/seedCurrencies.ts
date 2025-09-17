import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Currency } from '../models/currencyModel';

// Charger les variables d'environnement
dotenv.config();

interface CurrencyData {
  currencies: {
    [code: string]: {
      name: string;
      symbol: string;
    }
  }
}

async function seedCurrencies() {
  try {
    console.log('🚀 Starting currency seeding process...');

    // Connexion à MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/gigs';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Lire le fichier currencies.json
    const currenciesFilePath = path.join(__dirname, '../currencies.json');
    
    if (!fs.existsSync(currenciesFilePath)) {
      throw new Error('currencies.json file not found');
    }

    const currenciesData: CurrencyData[] = JSON.parse(fs.readFileSync(currenciesFilePath, 'utf8'));
    console.log(`📁 Loaded currencies.json with ${currenciesData.length} entries`);

    // Extraire toutes les devises uniques
    const uniqueCurrencies = new Map<string, { name: string; symbol: string }>();
    
    currenciesData.forEach((item: CurrencyData) => {
      if (item.currencies) {
        Object.entries(item.currencies).forEach(([code, details]) => {
          if (code && details && details.name && details.symbol) {
            // Nettoyer et normaliser les données
            const cleanCode = code.trim().toUpperCase();
            const cleanName = details.name.trim();
            const cleanSymbol = details.symbol.trim();
            
            // Garder seulement la première occurrence de chaque devise
            if (!uniqueCurrencies.has(cleanCode) && cleanCode.length === 3) {
              uniqueCurrencies.set(cleanCode, {
                name: cleanName,
                symbol: cleanSymbol
              });
            }
          }
        });
      }
    });

    console.log(`📊 Found ${uniqueCurrencies.size} unique currencies`);

    // Statistiques d'import
    let created = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // Traitement par batch pour améliorer les performances
    const batchSize = 50;
    const currencyEntries = Array.from(uniqueCurrencies.entries());
    
    for (let i = 0; i < currencyEntries.length; i += batchSize) {
      const batch = currencyEntries.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async ([code, details]) => {
        try {
          const existingCurrency = await Currency.findOne({ code });
          
          if (existingCurrency) {
            // Mettre à jour si les données ont changé
            if (existingCurrency.name !== details.name || 
                existingCurrency.symbol !== details.symbol ||
                !existingCurrency.isActive) {
              await Currency.findOneAndUpdate(
                { code },
                { 
                  name: details.name,
                  symbol: details.symbol,
                  isActive: true
                }
              );
              updated++;
              console.log(`🔄 Updated: ${code} - ${details.name}`);
            }
          } else {
            // Créer nouvelle devise
            const currency = new Currency({
              code,
              name: details.name,
              symbol: details.symbol,
              isActive: true
            });
            await currency.save();
            created++;
            console.log(`➕ Created: ${code} - ${details.name}`);
          }
        } catch (error: any) {
          errors++;
          const errorMsg = `Error processing ${code}: ${error.message}`;
          errorDetails.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }));
      
      // Afficher le progrès
      const processed = Math.min(i + batchSize, currencyEntries.length);
      console.log(`📈 Progress: ${processed}/${currencyEntries.length} currencies processed`);
    }

    // Résumé final
    console.log('\n📋 SEEDING SUMMARY:');
    console.log(`✅ Total currencies found: ${uniqueCurrencies.size}`);
    console.log(`➕ Created: ${created}`);
    console.log(`🔄 Updated: ${updated}`);
    console.log(`❌ Errors: ${errors}`);
    
    if (errorDetails.length > 0) {
      console.log('\n❌ Error details:');
      errorDetails.forEach(error => console.log(`  - ${error}`));
    }

    // Statistiques finales de la base de données
    const totalCurrencies = await Currency.countDocuments();
    const activeCurrencies = await Currency.countDocuments({ isActive: true });
    
    console.log(`\n💾 DATABASE STATS:`);
    console.log(`Total currencies in DB: ${totalCurrencies}`);
    console.log(`Active currencies: ${activeCurrencies}`);

    console.log('\n🎉 Currency seeding completed successfully!');

  } catch (error: any) {
    console.error('❌ Error during seeding:', error.message);
    process.exit(1);
  } finally {
    // Fermer la connexion MongoDB
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  seedCurrencies();
}

export { seedCurrencies };
