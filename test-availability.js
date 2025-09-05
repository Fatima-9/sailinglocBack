// Test des disponibilités dans la base de données
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sailingloc';

async function testAvailability() {
  console.log('🧪 Test des disponibilités dans la base de données...\n');

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

    // Importer le modèle Availability
    console.log('3. Test du modèle Availability...');
    const { default: Availability } = await import('./models/Availability.js');
    
    // Compter les disponibilités
    const count = await Availability.countDocuments();
    console.log(`   Nombre total de disponibilités: ${count}`);

    if (count > 0) {
      console.log('\n4. Détail des disponibilités:');
      const availabilities = await Availability.find().populate('boatId', 'nom');
      
      availabilities.forEach((availability, index) => {
        console.log(`   ${index + 1}. Bateau: ${availability.boatId?.nom || 'ID: ' + availability.boatId}`);
        console.log(`      Période: ${availability.startDate.toLocaleDateString()} - ${availability.endDate.toLocaleDateString()}`);
        console.log(`      Prix: ${availability.price}€`);
        console.log(`      Notes: ${availability.notes || 'Aucune'}`);
        console.log(`      Actif: ${availability.isActive}`);
        console.log('');
      });
    } else {
      console.log('\n4. Aucune disponibilité trouvée dans la base de données');
    }

    // Vérifier la connexion avec les bateaux
    console.log('5. Test de la relation avec les bateaux...');
    const { default: Boat } = await import('./models/Boat.js');
    const boatCount = await Boat.countDocuments();
    console.log(`   Nombre de bateaux: ${boatCount}`);

    if (boatCount > 0) {
      const boats = await Boat.find().select('nom _id');
      console.log('   Bateaux disponibles:');
      boats.forEach(boat => {
        console.log(`      - ${boat.nom} (ID: ${boat._id})`);
      });
    }

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
testAvailability();
