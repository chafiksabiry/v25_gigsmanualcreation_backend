const mongoose = require('mongoose');

async function testMongoDB() {
  try {
    console.log('🔍 Testing MongoDB connection...');
    
    // Connexion à MongoDB
    const mongoUri = 'mongodb://localhost:27017/gigs';
    console.log(`Connecting to: ${mongoUri}`);
    
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected successfully');

    // Lister les collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📂 Available collections:', collections.map(c => c.name));

    // Vérifier la collection currencies
    const currenciesExists = collections.some(c => c.name === 'currencies');
    console.log(`💾 Currencies collection exists: ${currenciesExists}`);

    if (currenciesExists) {
      const count = await mongoose.connection.db.collection('currencies').countDocuments();
      console.log(`📊 Number of currencies: ${count}`);
      
      if (count > 0) {
        const samples = await mongoose.connection.db.collection('currencies').find().limit(5).toArray();
        console.log('📋 Sample currencies:');
        samples.forEach(c => console.log(`  ${c.code} - ${c.name} (${c.symbol})`));
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Si MongoDB n'est pas accessible, suggérer des solutions
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Solutions possibles:');
      console.log('1. Vérifiez que MongoDB est installé et démarré');
      console.log('2. Démarrez MongoDB avec: mongod');
      console.log('3. Ou utilisez MongoDB Atlas avec une URI de connexion cloud');
    }
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connection closed');
  }
}

testMongoDB();
