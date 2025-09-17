// Script pour tester le nouveau paramètre 'all=true'
const API_BASE = 'http://localhost:5003/api';

async function testAllCurrencies() {
  console.log('🧪 Testing all currencies endpoint...\n');

  try {
    // Test 1: Récupérer toutes les devises sans pagination
    console.log('1️⃣ Testing all currencies without pagination...');
    
    const allResponse = await fetch(`${API_BASE}/currencies?all=true`);
    const allData = await allResponse.json();
    
    console.log('✅ All currencies response:', {
      success: allData.success,
      totalCurrencies: allData.total,
      dataLength: allData.data?.length,
      hasPagination: !!allData.pagination,
      message: allData.message
    });

    // Test 2: Comparer avec la pagination
    console.log('\n2️⃣ Comparing with paginated response...');
    
    const paginatedResponse = await fetch(`${API_BASE}/currencies?page=1&limit=50`);
    const paginatedData = await paginatedResponse.json();
    
    console.log('✅ Paginated response:', {
      success: paginatedData.success,
      dataLength: paginatedData.data?.length,
      total: paginatedData.pagination?.total,
      pages: paginatedData.pagination?.pages,
      message: paginatedData.message
    });

    // Test 3: Vérifier que le total correspond
    if (allData.total === paginatedData.pagination?.total) {
      console.log('✅ Total counts match between all and paginated endpoints');
    } else {
      console.log('❌ Total counts do not match!');
    }

    // Test 4: Afficher quelques exemples
    console.log('\n3️⃣ Sample currencies from all endpoint:');
    if (allData.data && allData.data.length > 0) {
      allData.data.slice(0, 5).forEach(currency => {
        console.log(`  ${currency.code} - ${currency.name} (${currency.symbol})`);
      });
      console.log(`  ... and ${allData.total - 5} more currencies`);
    }

    // Test 5: Tester avec filtres
    console.log('\n4️⃣ Testing all currencies with search filter...');
    
    const searchResponse = await fetch(`${API_BASE}/currencies?all=true&search=dollar`);
    const searchData = await searchResponse.json();
    
    console.log('✅ Search results (all dollars):', {
      total: searchData.total,
      currencies: searchData.data?.map(c => `${c.code} - ${c.name}`).slice(0, 5)
    });

    // Test 6: Performance comparison
    console.log('\n5️⃣ Performance comparison...');
    
    const startTime = Date.now();
    await fetch(`${API_BASE}/currencies?all=true`);
    const allTime = Date.now() - startTime;
    
    const startTime2 = Date.now();
    await fetch(`${API_BASE}/currencies?page=1&limit=50`);
    const paginatedTime = Date.now() - startTime2;
    
    console.log(`✅ Performance: All currencies: ${allTime}ms, Paginated: ${paginatedTime}ms`);

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('\n💡 Make sure the server is running: npm run dev');
    }
  }
}

// Exécuter les tests
testAllCurrencies();
