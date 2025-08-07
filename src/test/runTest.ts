import mongoose from 'mongoose';
import { testGetAllGigsWithPopulate } from './testPopulate';

async function runTests() {
  try {
    // Connexion à MongoDB (utilisez votre URI de DB)
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gigs_ai';
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Exécuter le test
    await testGetAllGigsWithPopulate();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Fermer la connexion
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Exécuter les tests si ce fichier est appelé directement
if (require.main === module) {
  runTests().then(() => {
    console.log('✅ Tests completed');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Tests failed:', error);
    process.exit(1);
  });
}