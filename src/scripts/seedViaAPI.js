// Script pour seeder les devises via l'API REST
const API_BASE = 'http://localhost:5003/api';

async function seedViaAPI() {
  console.log('🌱 Seeding currencies via API...');

  try {
    // Étape 1: Vérifier que l'API est accessible
    console.log('\n1️⃣ Checking API availability...');
    
    const healthResponse = await fetch(`${API_BASE}/currencies/stats`);
    if (!healthResponse.ok) {
      throw new Error(`API not responding: ${healthResponse.status}`);
    }
    
    const healthData = await healthResponse.json();
    console.log('✅ API is accessible');
    console.log('Current stats:', healthData.data);

    // Étape 2: Seeder les devises
    console.log('\n2️⃣ Seeding currencies...');
    
    const seedResponse = await fetch(`${API_BASE}/currencies/seed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!seedResponse.ok) {
      throw new Error(`Seed request failed: ${seedResponse.status}`);
    }

    const seedData = await seedResponse.json();
    console.log('Seed response:', seedData);

    if (seedData.success) {
      console.log('✅ Seeding completed successfully!');
      console.log(`📊 Results: ${seedData.data.created} created, ${seedData.data.updated} updated, ${seedData.data.errors} errors`);
    } else {
      console.log('❌ Seeding failed:', seedData.message);
      return;
    }

    // Étape 3: Vérifier le résultat
    console.log('\n3️⃣ Verifying results...');
    
    const verifyResponse = await fetch(`${API_BASE}/currencies?limit=10`);
    const verifyData = await verifyResponse.json();
    
    console.log('Verification:', {
      success: verifyData.success,
      totalCurrencies: verifyData.pagination?.total || 0,
      sampleCount: verifyData.data?.length || 0
    });

    if (verifyData.data && verifyData.data.length > 0) {
      console.log('\n📋 Sample currencies:');
      verifyData.data.slice(0, 5).forEach(c => {
        console.log(`  ${c.code} - ${c.name} (${c.symbol})`);
      });
      console.log('🎉 Currencies are now available via API!');
    } else {
      console.log('⚠️  Still no currencies returned by API');
    }

  } catch (error) {
    console.error('❌ Error during seeding:', error.message);
    
    if (error.message.includes('fetch') || error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Troubleshooting:');
      console.log('1. Make sure the server is running: npm run dev');
      console.log('2. Check if MongoDB is running');
      console.log('3. Verify the server is listening on port 5003');
      console.log('4. Check server logs for any errors');
    }
  }
}

// Exécuter le script
seedViaAPI();
