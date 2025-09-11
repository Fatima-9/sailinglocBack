import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import Boat from '../models/Boat.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Favorite from '../models/Favorite.js';

dotenv.config();

describe('Tests des Modèles', () => {
  beforeAll(async () => {
    // Configuration pour les tests
    process.env.NODE_ENV = 'test';
    
    // Connexion à la base de données de test
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sailingloc_test';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    // Nettoyer et fermer la connexion
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Nettoyer les collections avant chaque test
    await Promise.all([
      Booking.deleteMany({}),
      Review.deleteMany({}),
      Boat.deleteMany({}),
      User.deleteMany({}),
      Payment.deleteMany({}),
      Favorite.deleteMany({})
    ]);
  });

  describe('Modèle User', () => {
    test('devrait créer un utilisateur valide', async () => {
      const userData = {
        nom: 'Test User',
        prenom: 'Test',
        email: 'test@example.com',
        password: 'password123',
        role: 'client'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.nom).toBe(userData.nom);
      expect(savedUser.prenom).toBe(userData.prenom);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.role).toBe(userData.role);
      expect(savedUser.createdAt).toBeDefined();
    });

    test('devrait valider l\'email unique', async () => {
      const user1 = new User({
        nom: 'User 1',
        prenom: 'User',
        email: 'test@example.com',
        password: 'password123'
      });
      await user1.save();

      const user2 = new User({
        nom: 'User 2',
        prenom: 'User',
        email: 'test@example.com',
        password: 'password456'
      });

      await expect(user2.save()).rejects.toThrow();
    });

    test('devrait créer un propriétaire professionnel', async () => {
      const userData = {
        nom: 'Propriétaire',
        prenom: 'Test',
        email: 'proprio@example.com',
        password: 'password123',
        role: 'proprietaire',
        isProfessionnel: true,
        siret: '12345678901234',
        siren: '123456789'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.role).toBe('proprietaire');
      expect(savedUser.isProfessionnel).toBe(true);
      expect(savedUser.siret).toBe('12345678901234');
      expect(savedUser.siren).toBe('123456789');
    });
  });

  describe('Modèle Boat', () => {
    test('devrait créer un bateau valide', async () => {
      const user = new User({
        nom: 'Propriétaire',
        prenom: 'Test',
        email: 'proprio@example.com',
        password: 'password123',
        role: 'proprietaire'
      });
      const savedUser = await user.save();

      const boatData = {
        nom: 'Test Boat',
        type: 'voilier',
        longueur: 12,
        capacite: 8,
        prix_jour: 150,
        destination: 'marseille',
        image: 'https://firebasestorage.googleapis.com/test.jpg',
        description: 'Un beau bateau de test',
        equipements: ['GPS', 'Radio'],
        proprietaire: savedUser._id
      };

      const boat = new Boat(boatData);
      const savedBoat = await boat.save();

      expect(savedBoat._id).toBeDefined();
      expect(savedBoat.nom).toBe(boatData.nom);
      expect(savedBoat.type).toBe(boatData.type);
      expect(savedBoat.prix_jour).toBe(boatData.prix_jour);
      expect(savedBoat.equipements).toEqual(boatData.equipements);
    });

    test('devrait valider les champs obligatoires', async () => {
      const boat = new Boat({});

      await expect(boat.save()).rejects.toThrow();
    });

    test('devrait valider le type enum', async () => {
      const user = new User({
        nom: 'Propriétaire',
        prenom: 'Test',
        email: 'proprio@example.com',
        password: 'password123',
        role: 'proprietaire'
      });
      const savedUser = await user.save();

      const boat = new Boat({
        nom: 'Test Boat',
        type: 'invalid_type',
        longueur: 12,
        capacite: 8,
        prix_jour: 150,
        destination: 'marseille',
        image: 'https://firebasestorage.googleapis.com/test.jpg',
        proprietaire: savedUser._id
      });

      await expect(boat.save()).rejects.toThrow();
    });
  });

  describe('Modèle Booking', () => {
    test('devrait créer une réservation valide', async () => {
      const user = new User({
        nom: 'Test User',
        prenom: 'Test',
        email: 'test@example.com',
        password: 'password123',
        role: 'client'
      });
      const savedUser = await user.save();

      const boat = new Boat({
        nom: 'Test Boat',
        type: 'voilier',
        longueur: 12,
        capacite: 8,
        prix_jour: 150,
        destination: 'marseille',
        image: 'https://firebasestorage.googleapis.com/test.jpg',
        proprietaire: savedUser._id
      });
      const savedBoat = await boat.save();

      const bookingData = {
        userId: savedUser._id,
        boatId: savedBoat._id,
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-12-03'),
        numberOfGuests: 4,
        totalPrice: 300
      };

      const booking = new Booking(bookingData);
      const savedBooking = await booking.save();

      expect(savedBooking._id).toBeDefined();
      expect(savedBooking.userId.toString()).toBe(savedUser._id.toString());
      expect(savedBooking.boatId.toString()).toBe(savedBoat._id.toString());
      expect(savedBooking.status).toBe('pending');
      expect(savedBooking.numberOfGuests).toBe(4);
    });

    test('devrait valider les champs obligatoires', async () => {
      const booking = new Booking({});
      await expect(booking.save()).rejects.toThrow();
    });
  });

  describe('Modèle Review', () => {
    test('devrait créer un avis valide', async () => {
      const user = new User({
        nom: 'Test User',
        prenom: 'Test',
        email: 'test@example.com',
        password: 'password123',
        role: 'client'
      });
      const savedUser = await user.save();

      const boat = new Boat({
        nom: 'Test Boat',
        type: 'voilier',
        longueur: 12,
        capacite: 8,
        prix_jour: 150,
        destination: 'marseille',
        image: 'https://firebasestorage.googleapis.com/test.jpg',
        proprietaire: savedUser._id
      });
      const savedBoat = await boat.save();

      const reviewData = {
        userId: savedUser._id,
        boatId: savedBoat._id,
        rating: 5,
        comment: 'Excellent bateau ! Très confortable et bien équipé.'
      };

      const review = new Review(reviewData);
      const savedReview = await review.save();

      expect(savedReview._id).toBeDefined();
      expect(savedReview.rating).toBe(reviewData.rating);
      expect(savedReview.comment).toBe(reviewData.comment);
      expect(savedReview.userId.toString()).toBe(savedUser._id.toString());
      expect(savedReview.boatId.toString()).toBe(savedBoat._id.toString());
    });

    test('devrait valider la note entre 1 et 5', async () => {
      const review = new Review({
        rating: 6,
        comment: 'Test commentaire avec plus de 10 caractères pour valider la contrainte.'
      });

      await expect(review.save()).rejects.toThrow();
    });

    test('devrait valider la longueur minimale du commentaire', async () => {
      const review = new Review({
        rating: 5,
        comment: 'Court'
      });

      await expect(review.save()).rejects.toThrow();
    });
  });

  describe('Modèle Payment', () => {
    test('devrait créer un paiement valide', async () => {
      const user = new User({
        nom: 'Test User',
        prenom: 'Test',
        email: 'test@example.com',
        password: 'password123',
        role: 'client'
      });
      const savedUser = await user.save();

      const boat = new Boat({
        nom: 'Test Boat',
        type: 'voilier',
        longueur: 12,
        capacite: 8,
        prix_jour: 150,
        destination: 'marseille',
        image: 'https://firebasestorage.googleapis.com/test.jpg',
        proprietaire: savedUser._id
      });
      const savedBoat = await boat.save();

      const booking = new Booking({
        userId: savedUser._id,
        boatId: savedBoat._id,
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-12-03'),
        numberOfGuests: 4,
        totalPrice: 300
      });
      const savedBooking = await booking.save();

      const paymentData = {
        bookingId: savedBooking._id,
        totalAmount: 300
      };

      const payment = new Payment(paymentData);
      const savedPayment = await payment.save();

      expect(savedPayment._id).toBeDefined();
      expect(savedPayment.bookingId.toString()).toBe(savedBooking._id.toString());
      expect(savedPayment.totalAmount).toBe(paymentData.totalAmount);
    });
  });

  describe('Modèle Favorite', () => {
    test('devrait créer un favori valide', async () => {
      const user = new User({
        nom: 'Test User',
        prenom: 'Test',
        email: 'test@example.com',
        password: 'password123',
        role: 'client'
      });
      const savedUser = await user.save();

      const boat = new Boat({
        nom: 'Test Boat',
        type: 'voilier',
        longueur: 12,
        capacite: 8,
        prix_jour: 150,
        destination: 'marseille',
        image: 'https://firebasestorage.googleapis.com/test.jpg',
        proprietaire: savedUser._id
      });
      const savedBoat = await boat.save();

      const favoriteData = {
        userId: savedUser._id,
        boatId: savedBoat._id
      };

      const favorite = new Favorite(favoriteData);
      const savedFavorite = await favorite.save();

      expect(savedFavorite._id).toBeDefined();
      expect(savedFavorite.userId.toString()).toBe(savedUser._id.toString());
      expect(savedFavorite.boatId.toString()).toBe(savedBoat._id.toString());
      expect(savedFavorite.createdAt).toBeDefined();
    });

    test('devrait empêcher les doublons', async () => {
      const user = new User({
        nom: 'Test User',
        prenom: 'Test',
        email: 'test@example.com',
        password: 'password123',
        role: 'client'
      });
      const savedUser = await user.save();

      const boat = new Boat({
        nom: 'Test Boat',
        type: 'voilier',
        longueur: 12,
        capacite: 8,
        prix_jour: 150,
        destination: 'marseille',
        image: 'https://firebasestorage.googleapis.com/test.jpg',
        proprietaire: savedUser._id
      });
      const savedBoat = await boat.save();

      const favorite1 = new Favorite({
        userId: savedUser._id,
        boatId: savedBoat._id
      });
      await favorite1.save();

      const favorite2 = new Favorite({
        userId: savedUser._id,
        boatId: savedBoat._id
      });

      await expect(favorite2.save()).rejects.toThrow();
    });
  });

  describe('Relations entre modèles', () => {
    test('devrait pouvoir peupler les références', async () => {
      const user = new User({
        nom: 'Test User',
        prenom: 'Test',
        email: 'test@example.com',
        password: 'password123',
        role: 'client'
      });
      const savedUser = await user.save();

      const boat = new Boat({
        nom: 'Test Boat',
        type: 'voilier',
        longueur: 12,
        capacite: 8,
        prix_jour: 150,
        destination: 'marseille',
        image: 'https://firebasestorage.googleapis.com/test.jpg',
        proprietaire: savedUser._id
      });
      const savedBoat = await boat.save();

      const booking = new Booking({
        userId: savedUser._id,
        boatId: savedBoat._id,
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-12-03'),
        numberOfGuests: 4,
        totalPrice: 300
      });
      await booking.save();

      const populatedBooking = await Booking.findById(booking._id)
        .populate('userId')
        .populate('boatId');

      expect(populatedBooking.userId.nom).toBe('Test User');
      expect(populatedBooking.boatId.nom).toBe('Test Boat');
    });
  });

  describe('Méthodes des modèles', () => {
    test('devrait calculer la durée d\'une réservation', async () => {
      const user = new User({
        nom: 'Test User',
        prenom: 'Test',
        email: 'test@example.com',
        password: 'password123',
        role: 'client'
      });
      const savedUser = await user.save();

      const boat = new Boat({
        nom: 'Test Boat',
        type: 'voilier',
        longueur: 12,
        capacite: 8,
        prix_jour: 150,
        destination: 'marseille',
        image: 'https://firebasestorage.googleapis.com/test.jpg',
        proprietaire: savedUser._id
      });
      const savedBoat = await boat.save();

      const booking = new Booking({
        userId: savedUser._id,
        boatId: savedBoat._id,
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-12-03'),
        numberOfGuests: 4,
        totalPrice: 300
      });
      await booking.save();

      const duration = booking.getDurationInDays();
      expect(duration).toBe(2); // 2 jours entre le 1er et le 3 décembre
    });

    test('devrait calculer le prix d\'un bateau pour X jours', async () => {
      const user = new User({
        nom: 'Test User',
        prenom: 'Test',
        email: 'test@example.com',
        password: 'password123',
        role: 'client'
      });
      const savedUser = await user.save();

      const boat = new Boat({
        nom: 'Test Boat',
        type: 'voilier',
        longueur: 12,
        capacite: 8,
        prix_jour: 150,
        destination: 'marseille',
        image: 'https://firebasestorage.googleapis.com/test.jpg',
        proprietaire: savedUser._id
      });
      const savedBoat = await boat.save();

      const totalPrice = boat.calculatePrice(3);
      expect(totalPrice).toBe(450); // 150 * 3 jours
    });
  });
});
