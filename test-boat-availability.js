// Test des disponibilités dans le modèle Boat
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sailingloc';

async function testBoatAvailability() {
  console.log('🧪 Test des disponibilités dans le modèle Boat...\n');

  try {
    // Connexion à MongoDB
    console.log('1. Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connexion réussie à MongoDB\n');

    // Vérifier les collections existantes
    console.log('2. Collections existantes:');
    const collections = await mongoose.connection.db.listCollections().toArray();
    collections.forEach(collection => {
      console.log(`   - ${collection.name}`);
    });
    console.log('');

    // Importer le modèle Boat
    console.log('3. Test du modèle Boat...');
    const { default: Boat } = await import('./models/Boat.js');
    
    // Compter les bateaux
    const boatCount = await Boat.countDocuments();
    console.log(`   Nombre total de bateaux: ${boatCount}`);

    if (boatCount > 0) {
      console.log('\n4. Détail des bateaux avec disponibilités:');
      const boats = await Boat.find().select('nom availability');
      
      boats.forEach((boat, index) => {
        console.log(`   ${index + 1}. Bateau: ${boat.nom}`);
        if (boat.availability && boat.availability.startDate) {
          console.log(`      Disponibilité: ${boat.availability.startDate.toLocaleDateString()} - ${boat.availability.endDate.toLocaleDateString()} (${boat.availability.price}€)`);
          if (boat.availability.notes) {
            console.log(`      Notes: ${boat.availability.notes}`);
          }
        } else {
          console.log(`      Aucune disponibilité`);
        }
        console.log('');
      });
    } else {
      console.log('\n4. Aucun bateau trouvé dans la base de données');
    }

    // Test de création d'un bateau avec disponibilité
    console.log('5. Test de création d\'un bateau avec disponibilité...');
    const testBoat = new Boat({
      nom: 'Bateau Test',
      type: 'voilier',
      longueur: 10,
      prix_jour: 150,
      capacite: 6,
      image: 'https://example.com/test.jpg',
      destination: 'saint-malo',
      description: 'Bateau de test',
      equipements: ['GPS', 'Radio'],
      availability: {
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-12-07'),
        price: 150,
        notes: 'Test de disponibilité'
      },
      proprietaire: new mongoose.Types.ObjectId()
    });

    // Valider le document
    await testBoat.validate();
    console.log('✅ Validation du modèle Boat avec disponibilité réussie');
    
    // Ne pas sauvegarder le bateau de test
    console.log('ℹ️ Bateau de test non sauvegardé (validation uniquement)');

    console.log('\n✅ Tests terminés avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
  } finally {
    // Fermer la connexion
    await mongoose.connection.close();
    console.log('\n🔌 Connexion fermée');
  }
}

// Exécuter les tests
testBoatAvailability();
