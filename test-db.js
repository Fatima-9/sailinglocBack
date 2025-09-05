// Test de connexion à la base de données et création du modèle Availability
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sailingloc';

async function testDatabase() {
  console.log('🧪 Test de connexion à la base de données...\n');

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

    // Tester la création du modèle Availability
    console.log('3. Test de création du modèle Availability...');
    
    // Importer le modèle
    const { default: Availability } = await import('./models/Availability.js');
    
    // Vérifier si la collection existe
    const availabilityCollection = await mongoose.connection.db.listCollections({ name: 'availabilities' }).toArray();
    
    if (availabilityCollection.length > 0) {
      console.log('✅ Collection "availabilities" existe déjà');
      
      // Compter les documents
      const count = await Availability.countDocuments();
      console.log(`   Nombre de documents: ${count}`);
    } else {
      console.log('⚠️ Collection "availabilities" n\'existe pas encore');
      console.log('   Elle sera créée automatiquement lors de la première insertion');
    }

    // Tester la création d'un document de test (sans le sauvegarder)
    console.log('\n4. Test de validation du modèle...');
    try {
      const testAvailability = new Availability({
        boatId: new mongoose.Types.ObjectId(),
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-12-07'),
        price: 150,
        notes: 'Test de validation'
      });
      
      // Valider le document
      await testAvailability.validate();
      console.log('✅ Validation du modèle réussie');
    } catch (validationError) {
      console.log('❌ Erreur de validation:', validationError.message);
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
testDatabase();
