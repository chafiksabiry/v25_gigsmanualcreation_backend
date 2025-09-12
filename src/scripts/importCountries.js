const fs = require('fs');
const path = require('path');

// Importer fetch pour Node.js (compatible avec les versions récentes)
let fetch;
(async () => {
  try {
    // Essayer d'utiliser fetch natif (Node 18+)
    fetch = globalThis.fetch;
    if (!fetch) {
      // Fallback pour les versions plus anciennes
      const { default: nodeFetch } = await import('node-fetch');
      fetch = nodeFetch;
    }
  } catch (error) {
    console.error('❌ Fetch non disponible. Installez node-fetch : npm install node-fetch');
    process.exit(1);
  }
})();

// Script pour importer les pays via l'API
async function importCountries() {
  try {
    // Vérifier que fetch est disponible
    if (!fetch) {
      console.error('❌ Fetch non initialisé. Redémarrez le script.');
      return;
    }

    // Lire le fichier countries.json
    const countriesPath = path.join(__dirname, '../countries.json');
    const countriesData = JSON.parse(fs.readFileSync(countriesPath, 'utf8'));
    
    console.log(`📊 Trouvé ${countriesData.countries.length} pays à importer`);
    
    // Vérifier que le serveur est démarré
    console.log('🔍 Vérification de la connexion au serveur...');
    
    // Faire la requête POST à l'API
    const response = await fetch('http://localhost:5003/api/countries/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(countriesData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ ${result.data.length} pays importés avec succès !`);
      
      if (result.warnings) {
        console.log(`⚠️  ${result.warnings.message}`);
        console.log('Pays ignorés:', result.warnings.invalidCountries.length);
      }
    } else {
      console.error('❌ Erreur lors de l\'importation:', result.error);
      if (result.invalidCountries) {
        console.log(`Pays invalides: ${result.invalidCountries.length}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  importCountries();
}

module.exports = importCountries;
