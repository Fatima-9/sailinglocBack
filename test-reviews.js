import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Boat from './models/Boat.js';
import Review from './models/Review.js';

// Charger les variables d'environnement
dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connexion MongoDB réussie");
  } catch (error) {
    console.error("Échec connexion MongoDB :", error.message);
    process.exit(1);
  }
};

const createTestData = async () => {
  try {
    // Créer des utilisateurs de test
    const user1 = await User.create({
      nom: 'Martin',
      prenom: 'Sophie',
      email: 'sophie.martin@test.com',
      password: 'password123',
      role: 'client'
    });

    const user2 = await User.create({
      nom: 'Dubois',
      prenom: 'Pierre',
      email: 'pierre.dubois@test.com',
      password: 'password123',
      role: 'client'
    });

    const user3 = await User.create({
      nom: 'Leroy',
      prenom: 'Marie',
      email: 'marie.leroy@test.com',
      password: 'password123',
      role: 'client'
    });

    const proprietaire = await User.create({
      nom: 'Dupont',
      prenom: 'Jean',
      email: 'jean.dupont@test.com',
      password: 'password123',
      role: 'proprietaire'
    });

    console.log('Utilisateurs créés');

    // Créer des bateaux de test
    const boat1 = await Boat.create({
      nom: 'Voilier Élégance',
      type: 'voilier',
      longueur: 12,
      prix_jour: 150,
      capacite: 6,
      image: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg',
      localisation: 'Saint-Malo',
      description: 'Magnifique voilier pour vos escapades en mer',
      proprietaire: proprietaire._id
    });

    const boat2 = await Boat.create({
      nom: 'Catamaran Horizon',
      type: 'catamaran',
      longueur: 15,
      prix_jour: 200,
      capacite: 8,
      image: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg',
      localisation: 'Les Glénan',
      description: 'Catamaran spacieux et confortable',
      proprietaire: proprietaire._id
    });

    const boat3 = await Boat.create({
      nom: 'Yacht Prestige',
      type: 'bateau à moteur',
      longueur: 18,
      prix_jour: 300,
      capacite: 10,
      image: 'https://images.pexels.com/photos/1001682/pexels-photo-1001682.jpeg',
      localisation: 'Marseille',
      description: 'Yacht de luxe pour des croisières inoubliables',
      proprietaire: proprietaire._id
    });

    console.log('Bateaux créés');

    // Créer des avis 5 étoiles avec des dates différentes
    const review1 = await Review.create({
      userId: user1._id,
      boatId: boat1._id,
      rating: 5,
      comment: "Expérience exceptionnelle ! Le bateau était parfait et le service impeccable. Je recommande vivement pour vos escapades en mer.",
      createdAt: new Date('2024-01-15')
    });

    const review2 = await Review.create({
      userId: user2._id,
      boatId: boat2._id,
      rating: 5,
      comment: "Un voyage de rêve ! L'équipage était aux petits soins et nous avons découvert des endroits magnifiques. À refaire absolument !",
      createdAt: new Date('2024-01-20')
    });

    const review3 = await Review.create({
      userId: user3._id,
      boatId: boat3._id,
      rating: 5,
      comment: "Service client au top et bateau en parfait état. Nous avons passé une semaine inoubliable sur la Méditerranée. Merci SailingLoc !",
      createdAt: new Date('2024-01-25')
    });

    // Créer un avis 4 étoiles pour tester le filtrage
    const review4 = await Review.create({
      userId: user1._id,
      boatId: boat2._id,
      rating: 4,
      comment: "Très bon bateau, mais il manquait quelques équipements.",
      createdAt: new Date('2024-01-30')
    });

    console.log('Avis créés');
    console.log('Données de test créées avec succès !');

  } catch (error) {
    console.error('Erreur lors de la création des données de test:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Connexion fermée');
  }
};

// Exécuter le script
connectDB().then(() => {
  createTestData();
});
