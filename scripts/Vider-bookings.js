import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Utiliser la même variable d'environnement que l'application
const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error('❌ Variable d\'environnement MONGO_URI non définie');
  console.log('💡 Vérifiez votre fichier .env');
  process.exit(1);
}

async function executeMongoCommands() {
  try {
    console.log('🔌 Connexion à MongoDB Atlas...');
    console.log('📍 URL:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Masquer les credentials
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB Atlas avec succès');
    
    const db = mongoose.connection.db;
    
    // Utiliser la base de données sailingloc
    console.log('📊 Base de données:', db.databaseName);
    
    // Lister toutes les collections
    const collections = await db.listCollections().toArray();
    console.log('📋 Collections disponibles:', collections.map(col => col.name));
    
    // Vérifier si la collection bookings existe
    const hasBookings = collections.some(col => col.name === 'bookings');
    
    if (!hasBookings) {
      console.log('ℹ️  Collection "bookings" non trouvée');
      return;
    }
    
    // Compter les documents avant suppression
    const countBefore = await db.collection('bookings').countDocuments();
    console.log(`📊 Nombre de documents avant suppression : ${countBefore}`);
    
    if (countBefore === 0) {
      console.log('ℹ️  Collection déjà vide');
      return;
    }
    
    // Supprimer tous les documents de la collection bookings
    console.log('🗑️  Suppression de tous les documents de bookings...');
    const result = await db.collection('bookings').deleteMany({});
    
    console.log(`✅ ${result.deletedCount} documents supprimés avec succès`);
    
    // Vérifier le nombre de documents restants
    const countAfter = await db.collection('bookings').countDocuments();
    console.log(`📊 Nombre de documents restants : ${countAfter}`);
    
  } catch (error) {
    console.error('❌ Erreur :', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Connexion fermée');
    process.exit(0);
  }
}

executeMongoCommands();
