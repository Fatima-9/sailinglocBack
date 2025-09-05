import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';

// Charger les variables d'environnement
dotenv.config();

const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error('❌ Variable d\'environnement MONGO_URI non définie');
  console.log('💡 Vérifiez votre fichier .env');
  process.exit(1);
}

async function createAdmin() {
  try {
    console.log('🔌 Connexion à MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB Atlas avec succès');
    
    // Vérifier si un admin existe déjà
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('⚠️  Un administrateur existe déjà :', existingAdmin.email);
      console.log('💡 Si vous voulez créer un nouvel admin, supprimez d\'abord l\'existant');
      return;
    }
    
    // Données de l'admin
    const adminData = {
      nom: 'Admin',
      prenom: 'Système',
      email: 'admin@sailingloc.com',
      password: 'admin123', // Sera hashé automatiquement
      tel: '+33123456789',
      role: 'admin',
      isProfessionnel: false,
      status: 'actif'
    };
    
    console.log('👤 Création de l\'administrateur...');
    const admin = new User(adminData);
    await admin.save();
    
    console.log('✅ Administrateur créé avec succès !');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Mot de passe: admin123');
    console.log('👑 Rôle:', admin.role);
    console.log('📊 ID:', admin._id);
    
  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'admin:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Connexion fermée');
    process.exit(0);
  }
}

createAdmin();
