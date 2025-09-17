import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5003/api';

async function testCurrencyEndpoints() {
  console.log('🧪 Testing Currency API Endpoints...\n');

  try {
    // Test 1: Seed currencies
    console.log('📦 Test 1: Seeding currencies from currencies.json');
    const seedResponse = await fetch(`${API_BASE}/currencies/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const seedData = await seedResponse.json();
    console.log('✅ Seed result:', seedData);
    console.log('');

    // Test 2: Get all currencies with pagination
    console.log('📋 Test 2: Get all currencies (first 10)');
    const allCurrenciesResponse = await fetch(`${API_BASE}/currencies?limit=10&page=1`);
    const allCurrenciesData = await allCurrenciesResponse.json();
    console.log('✅ Retrieved currencies:', {
      total: allCurrenciesData.pagination?.total,
      page: allCurrenciesData.pagination?.page,
      count: allCurrenciesData.data?.length
    });
    console.log('Sample currencies:', allCurrenciesData.data?.slice(0, 3).map((c: any) => `${c.code} - ${c.name} (${c.symbol})`));
    console.log('');

    // Test 3: Search currencies
    console.log('🔍 Test 3: Search currencies (EUR)');
    const searchResponse = await fetch(`${API_BASE}/currencies?search=EUR`);
    const searchData = await searchResponse.json();
    console.log('✅ Search results:', searchData.data?.map((c: any) => `${c.code} - ${c.name} (${c.symbol})`));
    console.log('');

    // Test 4: Get specific currency
    console.log('💰 Test 4: Get specific currency (USD)');
    const usdResponse = await fetch(`${API_BASE}/currencies/USD`);
    const usdData = await usdResponse.json();
    console.log('✅ USD details:', usdData.data ? `${usdData.data.code} - ${usdData.data.name} (${usdData.data.symbol})` : 'Not found');
    console.log('');

    // Test 5: Get currency statistics
    console.log('📊 Test 5: Get currency statistics');
    const statsResponse = await fetch(`${API_BASE}/currencies/stats`);
    const statsData = await statsResponse.json();
    console.log('✅ Statistics:', {
      total: statsData.data?.total,
      active: statsData.data?.active,
      inactive: statsData.data?.inactive,
      topSymbols: statsData.data?.topSymbols?.slice(0, 3).map((s: any) => `${s._id} (${s.count} currencies)`)
    });
    console.log('');

    // Test 6: Create new currency
    console.log('➕ Test 6: Create new test currency');
    const newCurrencyData = {
      code: 'TEST',
      name: 'Test Currency',
      symbol: 'T$',
      isActive: true
    };
    
    const createResponse = await fetch(`${API_BASE}/currencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCurrencyData)
    });
    const createData = await createResponse.json();
    console.log('✅ Created currency:', createData.success ? `${createData.data.code} - ${createData.data.name}` : createData.message);
    console.log('');

    // Test 7: Update currency
    console.log('🔄 Test 7: Update test currency');
    const updateData = {
      name: 'Updated Test Currency',
      symbol: 'UT$'
    };
    
    const updateResponse = await fetch(`${API_BASE}/currencies/TEST`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    const updateResult = await updateResponse.json();
    console.log('✅ Updated currency:', updateResult.success ? `${updateResult.data.code} - ${updateResult.data.name} (${updateResult.data.symbol})` : updateResult.message);
    console.log('');

    // Test 8: Delete (deactivate) currency
    console.log('🗑️  Test 8: Delete (deactivate) test currency');
    const deleteResponse = await fetch(`${API_BASE}/currencies/TEST`, {
      method: 'DELETE'
    });
    const deleteData = await deleteResponse.json();
    console.log('✅ Deleted currency:', deleteData.success ? `${deleteData.data.code} - Active: ${deleteData.data.isActive}` : deleteData.message);
    console.log('');

    // Test 9: Filter by active status
    console.log('🟢 Test 9: Get only active currencies (first 5)');
    const activeResponse = await fetch(`${API_BASE}/currencies?isActive=true&limit=5`);
    const activeData = await activeResponse.json();
    console.log('✅ Active currencies:', activeData.data?.map((c: any) => `${c.code} - ${c.name}`));
    console.log('');

    console.log('🎉 All currency endpoint tests completed successfully!');

  } catch (error: any) {
    console.error('❌ Error during testing:', error.message);
    process.exit(1);
  }
}

// Exécuter les tests si appelé directement
if (require.main === module) {
  testCurrencyEndpoints();
}

export { testCurrencyEndpoints };
