import mongoose from 'mongoose';
import { Country } from '../models/countryModel';
import dotenv from 'dotenv';

dotenv.config();

async function quickTest() {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    
    const countries = await Country.find().lean();
    console.log(`📊 ${countries.length} pays en base`);
    
    // Chercher le Maroc
    const morocco = countries.find(c => c.cca2 === 'MA');
    console.log('🇲🇦 Maroc:', morocco ? `${morocco.name.common} (${morocco.cca2})` : 'NON TROUVÉ');
    
    // Chercher Jamaica
    const jamaica = countries.find(c => c.cca2 === 'JM');
    console.log('🇯🇲 Jamaica:', jamaica ? `${jamaica.name.common} (${jamaica.cca2})` : 'NON TROUVÉ');
    
    // Test de la logique de mapping
    const testDescription = "je veux le time zone de Morocco";
    console.log(`\n📝 Description test: "${testDescription}"`);
    console.log('🔍 Contient "Morocco":', testDescription.toLowerCase().includes('morocco'));
    
    await mongoose.disconnect();
  } catch (error: any) {
    console.error('❌ Erreur:', error.message);
  }
}

quickTest();
