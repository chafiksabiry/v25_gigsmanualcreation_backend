import mongoose from 'mongoose';
import { Currency } from '../models/currencyModel';

async function diagnoseCurrencies() {
  try {
    console.log('🔍 Diagnosing currencies issue...');

    // Test 1: Connexion MongoDB
    console.log('\n1️⃣ Testing MongoDB connection...');
    const mongoUri = 'mongodb://localhost:27017/gigs';
    console.log(`Connecting to: ${mongoUri}`);
    
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected successfully');

    // Test 2: Vérifier les collections
    console.log('\n2️⃣ Checking collections...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));

    // Test 3: Compter les documents dans la collection currencies
    console.log('\n3️⃣ Checking currencies collection...');
    const count = await Currency.countDocuments();
    console.log(`Total currencies: ${count}`);

    if (count === 0) {
      console.log('⚠️  No currencies found. Let\'s seed some...');
      
      // Test 4: Créer une devise de test
      console.log('\n4️⃣ Creating test currency...');
      const testCurrency = new Currency({
        code: 'TEST',
        name: 'Test Currency',
        symbol: 'T$',
        isActive: true
      });
      
      await testCurrency.save();
      console.log('✅ Test currency created');
      
      const newCount = await Currency.countDocuments();
      console.log(`New total: ${newCount}`);
    } else {
      console.log('\n4️⃣ Sample currencies:');
      const samples = await Currency.find().limit(5).lean();
      samples.forEach(c => console.log(`  ${c.code} - ${c.name} (${c.symbol})`));
    }

    // Test 5: Vérifier l'endpoint directement
    console.log('\n5️⃣ Testing API endpoint simulation...');
    const allCurrencies = await Currency.find().limit(5).lean();
    console.log('Direct query result:', {
      count: allCurrencies.length,
      data: allCurrencies.map(c => ({ code: c.code, name: c.name, symbol: c.symbol }))
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Connection closed');
  }
}

diagnoseCurrencies();
