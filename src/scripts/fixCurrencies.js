const fs = require('fs');
const path = require('path');

// URL de base de l'API (assumons que le serveur tourne sur le port 5003)
const API_BASE = 'http://localhost:5003/api';

async function fixCurrencies() {
  console.log('🔧 Fixing currencies issue...');

  try {
    // Test 1: Vérifier si l'API répond
    console.log('\n1️⃣ Testing API connection...');
    
    const response = await fetch(`${API_BASE}/currencies/stats`);
    const data = await response.json();
    
    console.log('✅ API is responding');
    console.log('Current stats:', data.data);

    if (data.data && data.data.total === 0) {
      console.log('\n2️⃣ No currencies found. Seeding from currencies.json...');
      
      // Appeler l'endpoint de seed
      const seedResponse = await fetch(`${API_BASE}/currencies/seed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const seedData = await seedResponse.json();
      console.log('Seed result:', seedData);
      
      if (seedData.success) {
        console.log('✅ Currencies seeded successfully!');
        
        // Vérifier à nouveau
        const newStatsResponse = await fetch(`${API_BASE}/currencies/stats`);
        const newStats = await newStatsResponse.json();
        console.log('New stats:', newStats.data);
      } else {
        console.log('❌ Seeding failed:', seedData.message);
      }
      
    } else {
      console.log('✅ Currencies already exist in database');
    }

    // Test 3: Récupérer quelques devises pour vérifier
    console.log('\n3️⃣ Testing currency retrieval...');
    const currenciesResponse = await fetch(`${API_BASE}/currencies?limit=5`);
    const currenciesData = await currenciesResponse.json();
    
    console.log('Currencies API response:', {
      success: currenciesData.success,
      dataLength: currenciesData.data?.length || 0,
      total: currenciesData.pagination?.total || 0
    });
    
    if (currenciesData.data && currenciesData.data.length > 0) {
      console.log('Sample currencies:');
      currenciesData.data.forEach(c => {
        console.log(`  ${c.code} - ${c.name} (${c.symbol})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('\n💡 Solutions:');
      console.log('1. Assurez-vous que le serveur est démarré: npm run dev');
      console.log('2. Vérifiez que le serveur écoute sur le port 5003');
      console.log('3. Vérifiez que MongoDB est démarré et accessible');
    }
  }
}

// Exécuter la fonction
fixCurrencies();
