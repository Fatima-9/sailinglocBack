import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Booking from './models/Booking.js';
import Review from './models/Review.js';

dotenv.config();

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sailingloc')
  .then(() => console.log('✅ Connexion MongoDB réussie'))
  .catch(err => console.error('❌ Erreur connexion MongoDB:', err));

// Test des modèles
async function testModels() {
  try {
    console.log('\n🧪 Test des modèles...\n');

    // Test du modèle Booking
    console.log('📋 Modèle Booking:');
    console.log('  - Champs:', Object.keys(Booking.schema.paths));
    console.log('  - Index:', Object.keys(Booking.schema.indexes()));
    
    // Test du modèle Review
    console.log('\n⭐ Modèle Review:');
    console.log('  - Champs:', Object.keys(Review.schema.paths));
    console.log('  - Index:', Object.keys(Review.schema.indexes()));

    console.log('\n✅ Tous les modèles sont prêts !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    mongoose.connection.close();
  }
}

testModels();
