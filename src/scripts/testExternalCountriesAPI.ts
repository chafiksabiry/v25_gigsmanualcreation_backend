import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

async function testExternalCountriesAPI() {
  try {
    console.log('🔍 Test de l\'API Countries externe sur le port 5011...');
    
    // Tester la connexion à l'API externe
    const response = await fetch('http://localhost:5011/api/countries');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.data) {
      console.log(`✅ API externe accessible: ${data.data.length} pays récupérés`);
      
      // Afficher quelques exemples
      console.log('\n📋 Premiers pays:');
      data.data.slice(0, 5).forEach((country: any, index: number) => {
        console.log(`  ${index + 1}. ${country.name.common} (${country.cca2})`);
        if (country.flags?.png) {
          console.log(`     🏳️ Drapeau: ${country.flags.png}`);
        }
      });
      
      // Chercher des pays spécifiques
      console.log('\n🔍 Recherche de pays spécifiques:');
      const testCountries = ['Morocco', 'Egypt', 'Bangladesh', 'France'];
      
      for (const testCountry of testCountries) {
        const found = data.data.find((c: any) => 
          c.name.common.toLowerCase() === testCountry.toLowerCase()
        );
        
        if (found) {
          console.log(`  ✅ ${testCountry}: ${found.name.common} (${found.cca2})`);
        } else {
          console.log(`  ❌ ${testCountry}: Non trouvé`);
        }
      }
      
      // Tester la structure des données
      console.log('\n🧪 Structure des données:');
      const firstCountry = data.data[0];
      console.log('  - _id:', firstCountry._id ? '✅' : '❌');
      console.log('  - cca2:', firstCountry.cca2 ? '✅' : '❌');
      console.log('  - name.common:', firstCountry.name?.common ? '✅' : '❌');
      console.log('  - name.official:', firstCountry.name?.official ? '✅' : '❌');
      console.log('  - name.nativeName:', firstCountry.name?.nativeName ? '✅' : '❌');
      console.log('  - flags:', firstCountry.flags ? '✅' : '❌');
      console.log('  - createdAt:', firstCountry.createdAt ? '✅' : '❌');
      
    } else {
      console.error('❌ Réponse API invalide:', data);
    }
    
  } catch (error: any) {
    console.error('❌ Erreur lors du test API externe:', error.message);
    console.log('\n💡 Assurez-vous que:');
    console.log('  1. Le serveur sur le port 5004 est démarré');
    console.log('  2. L\'endpoint /api/countries est accessible');
    console.log('  3. La réponse a le format { success: true, data: [...] }');
  }
}

// Exécuter le test si appelé directement
if (require.main === module) {
  testExternalCountriesAPI();
}

export default testExternalCountriesAPI;
