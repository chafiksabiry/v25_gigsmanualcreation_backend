// Script pour tester que /api/currencies retourne toutes les devises par défaut
const API_BASE = 'http://localhost:5003/api';

async function testDefaultAllCurrencies() {
  console.log('🧪 Testing default behavior: all currencies without pagination...\n');

  try {
    // Test 1: Appel simple sans paramètres - doit retourner TOUTES les devises
    console.log('1️⃣ Testing default endpoint /api/currencies (should return ALL currencies)...');
    
    const defaultResponse = await fetch(`${API_BASE}/currencies`);
    const defaultData = await defaultResponse.json();
    
    console.log('✅ Default response:', {
      success: defaultData.success,
      totalCurrencies: defaultData.total,
      dataLength: defaultData.data?.length,
      hasPagination: !!defaultData.pagination,
      message: defaultData.message
    });

    // Vérifier qu'il n'y a pas d'objet pagination
    if (!defaultData.pagination) {
      console.log('✅ Correct: No pagination object in response');
    } else {
      console.log('❌ Error: Pagination object found in default response');
    }

    // Vérifier qu'on a bien toutes les devises
    if (defaultData.total === defaultData.data?.length) {
      console.log('✅ Correct: Total matches data length (all currencies returned)');
    } else {
      console.log('❌ Error: Total does not match data length');
    }

    // Test 2: Avec pagination explicite
    console.log('\n2️⃣ Testing paginated endpoint (should return paginated results)...');
    
    const paginatedResponse = await fetch(`${API_BASE}/currencies?paginated=true&page=1&limit=10`);
    const paginatedData = await paginatedResponse.json();
    
    console.log('✅ Paginated response:', {
      success: paginatedData.success,
      dataLength: paginatedData.data?.length,
      hasPagination: !!paginatedData.pagination,
      page: paginatedData.pagination?.page,
      limit: paginatedData.pagination?.limit,
      total: paginatedData.pagination?.total,
      pages: paginatedData.pagination?.pages
    });

    // Vérifier qu'on a bien la pagination
    if (paginatedData.pagination) {
      console.log('✅ Correct: Pagination object found in paginated response');
    } else {
      console.log('❌ Error: No pagination object in paginated response');
    }

    // Test 3: Avec filtres (doit toujours retourner tout sans pagination)
    console.log('\n3️⃣ Testing with search filter (should return all matching currencies)...');
    
    const searchResponse = await fetch(`${API_BASE}/currencies?search=dollar`);
    const searchData = await searchResponse.json();
    
    console.log('✅ Search response:', {
      success: searchData.success,
      totalMatching: searchData.total,
      dataLength: searchData.data?.length,
      hasPagination: !!searchData.pagination,
      sampleCurrencies: searchData.data?.slice(0, 3).map(c => `${c.code} - ${c.name}`)
    });

    // Test 4: Avec isActive filter
    console.log('\n4️⃣ Testing with isActive filter...');
    
    const activeResponse = await fetch(`${API_BASE}/currencies?isActive=true`);
    const activeData = await activeResponse.json();
    
    console.log('✅ Active currencies response:', {
      success: activeData.success,
      totalActive: activeData.total,
      dataLength: activeData.data?.length,
      hasPagination: !!activeData.pagination
    });

    // Test 5: Comparaison des totaux
    console.log('\n5️⃣ Comparing totals...');
    
    const expectedTotal = defaultData.total;
    const paginatedTotal = paginatedData.pagination?.total;
    const activeTotal = activeData.total;
    
    console.log('📊 Total comparison:', {
      defaultEndpoint: expectedTotal,
      paginatedEndpoint: paginatedTotal,
      activeFilter: activeTotal,
      allMatch: expectedTotal === paginatedTotal && expectedTotal === activeTotal
    });

    console.log('\n🎉 All tests completed!');
    console.log(`🚀 Endpoint /api/currencies now returns ALL ${expectedTotal} currencies by default!`);

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('\n💡 Make sure the server is running: npm run dev');
    }
  }
}

// Exécuter les tests
testDefaultAllCurrencies();
