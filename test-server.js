// Test simple du serveur
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001/api';

async function testServer() {
  console.log('🧪 Test du serveur backend...\n');

  try {
    // Test 1: Vérifier que le serveur répond
    console.log('1. Test de connexion au serveur...');
    const response = await fetch(`${BASE_URL}/boats`);
    
    if (response.ok) {
      console.log('✅ Serveur accessible');
      const boats = await response.json();
      console.log(`   Nombre de bateaux: ${boats.length}`);
    } else {
      console.log(`❌ Erreur serveur: ${response.status} ${response.statusText}`);
    }

    // Test 2: Tester l'endpoint de disponibilités avec un ID invalide
    console.log('\n2. Test endpoint disponibilités...');
    const availabilityResponse = await fetch(`${BASE_URL}/boats/invalid-id/availability`);
    console.log(`   Status: ${availabilityResponse.status}`);
    
    if (availabilityResponse.status === 404) {
      console.log('✅ Endpoint fonctionne (erreur 404 attendue pour ID invalide)');
    } else {
      const errorData = await availabilityResponse.json();
      console.log(`   Réponse: ${JSON.stringify(errorData, null, 2)}`);
    }

    console.log('\n✅ Tests terminés !');

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Le serveur backend n\'est pas démarré.');
      console.log('   Démarrez-le avec: cd backend && npm start');
    }
  }
}

// Exécuter les tests
testServer();
