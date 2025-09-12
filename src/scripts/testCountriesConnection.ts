import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

async function testCountriesConnection() {
  const ports = [5004, 5011, 3000, 3001];
  
  console.log('🔍 Test de connectivité aux APIs Countries...\n');
  
  for (const port of ports) {
    try {
      console.log(`📡 Test port ${port}...`);
      const response = await fetch(`http://localhost:${port}/api/countries`, {
        signal: AbortSignal.timeout(5000) // 5 secondes timeout
      });
      
      if (response.ok) {
        const data: any = await response.json();
        if (data.success && data.data) {
          console.log(`✅ Port ${port}: ${data.data.length} pays trouvés`);
          
          // Afficher quelques exemples
          const examples = data.data.slice(0, 3).map((c: any) => 
            `${c.name.common} (${c.cca2})`
          ).join(', ');
          console.log(`   Exemples: ${examples}\n`);
        } else {
          console.log(`⚠️  Port ${port}: Réponse invalide\n`);
        }
      } else {
        console.log(`❌ Port ${port}: HTTP ${response.status}\n`);
      }
    } catch (error: any) {
      if (error.name === 'TimeoutError') {
        console.log(`⏰ Port ${port}: Timeout (>5s)\n`);
      } else if (error.cause?.code === 'ECONNREFUSED') {
        console.log(`🔌 Port ${port}: Connexion refusée (service non démarré)\n`);
      } else {
        console.log(`❌ Port ${port}: ${error.message}\n`);
      }
    }
  }
  
  // Test de la variable d'environnement
  const envUrl = process.env.COUNTRIES_API_URL;
  if (envUrl) {
    console.log(`🔧 Variable d'environnement COUNTRIES_API_URL: ${envUrl}`);
    try {
      const response = await fetch(envUrl, {
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        const data: any = await response.json();
        console.log(`✅ URL env: ${data.success ? data.data.length + ' pays' : 'Erreur format'}`);
      } else {
        console.log(`❌ URL env: HTTP ${response.status}`);
      }
    } catch (error: any) {
      console.log(`❌ URL env: ${error.message}`);
    }
  } else {
    console.log('⚠️  Variable COUNTRIES_API_URL non définie');
  }
  
  console.log('\n💡 Pour configurer l\'URL:');
  console.log('   export COUNTRIES_API_URL=http://localhost:XXXX/api/countries');
  console.log('   ou modifiez le Dockerfile');
}

if (require.main === module) {
  testCountriesConnection();
}

export default testCountriesConnection;
