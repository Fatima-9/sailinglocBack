import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Import des modèles
import User from '../models/User.js';
import Boat from '../models/Boat.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import Payment from '../models/Payment.js';
import Favorite from '../models/Favorite.js';
import Availability from '../models/Availability.js';

// Fonction pour échapper les chaînes SQL
function escapeString(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${str.toString().replace(/'/g, "''")}'`;
}

// Fonction pour formater les dates
function formatDate(date) {
  if (!date) return 'NULL';
  return `'${new Date(date).toISOString().slice(0, 19).replace('T', ' ')}'`;
}

// Fonction pour formater les ObjectId
function formatObjectId(id) {
  if (!id) return 'NULL';
  return `'${id.toString()}'`;
}

// Fonction pour formater les booléens
function formatBoolean(bool) {
  if (bool === null || bool === undefined) return 'NULL';
  return bool ? '1' : '0';
}

// Fonction pour formater les nombres
function formatNumber(num) {
  if (num === null || num === undefined) return 'NULL';
  return num.toString();
}

// Fonction pour formater les tableaux JSON
function formatArray(arr) {
  if (!arr || !Array.isArray(arr)) return 'NULL';
  return `'${JSON.stringify(arr).replace(/'/g, "''")}'`;
}

async function exportDatabase() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connexion MongoDB réussie');

    // Créer le contenu SQL
    let sqlContent = `-- Export de la base de données SailingLoc
-- Généré le ${new Date().toLocaleString('fr-FR')}
-- Format: DEV {Numéro classe} – G{Numéro groupe} – bdd.sql

-- =============================================
-- CRÉATION DES TABLES
-- =============================================

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    _id VARCHAR(24) PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    tel VARCHAR(20),
    role ENUM('admin', 'client', 'proprietaire') DEFAULT 'client',
    isProfessionnel BOOLEAN DEFAULT FALSE,
    siret VARCHAR(14),
    siren VARCHAR(9),
    status ENUM('actif', 'inactif', 'suspendu') DEFAULT 'actif',
    createdAt DATETIME,
    updatedAt DATETIME
);

-- Table des bateaux
CREATE TABLE IF NOT EXISTS boats (
    _id VARCHAR(24) PRIMARY KEY,
    nom VARCHAR(100) NOT NULL UNIQUE,
    type ENUM('voilier', 'yacht', 'catamaran') NOT NULL,
    longueur DECIMAL(5,2) NOT NULL,
    prix_jour DECIMAL(10,2) NOT NULL,
    capacite INT NOT NULL,
    image TEXT NOT NULL,
    destination ENUM('saint-malo', 'les-glenan', 'crozon', 'la-rochelle', 'marseille', 'cannes', 'ajaccio', 'barcelone', 'palma', 'athenes', 'venise', 'amsterdam', 'split') NOT NULL,
    description TEXT,
    equipements JSON,
    disponible BOOLEAN DEFAULT TRUE,
    availability JSON,
    existingBookings JSON,
    proprietaire VARCHAR(24) NOT NULL,
    createdAt DATETIME,
    updatedAt DATETIME,
    FOREIGN KEY (proprietaire) REFERENCES users(_id)
);

-- Table des réservations
CREATE TABLE IF NOT EXISTS bookings (
    _id VARCHAR(24) PRIMARY KEY,
    userId VARCHAR(24) NOT NULL,
    boatId VARCHAR(24) NOT NULL,
    startDate DATE NOT NULL,
    endDate DATE NOT NULL,
    totalPrice DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
    paymentStatus ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
    numberOfGuests INT NOT NULL,
    specialRequests TEXT,
    createdAt DATETIME,
    updatedAt DATETIME,
    FOREIGN KEY (userId) REFERENCES users(_id),
    FOREIGN KEY (boatId) REFERENCES boats(_id)
);

-- Table des avis
CREATE TABLE IF NOT EXISTS reviews (
    _id VARCHAR(24) PRIMARY KEY,
    userId VARCHAR(24) NOT NULL,
    boatId VARCHAR(24) NOT NULL,
    bookingId VARCHAR(24),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    helpful INT DEFAULT 0,
    createdAt DATETIME,
    updatedAt DATETIME,
    FOREIGN KEY (userId) REFERENCES users(_id),
    FOREIGN KEY (boatId) REFERENCES boats(_id),
    FOREIGN KEY (bookingId) REFERENCES bookings(_id)
);

-- Table des paiements
CREATE TABLE IF NOT EXISTS payments (
    _id VARCHAR(24) PRIMARY KEY,
    bookingId VARCHAR(24) NOT NULL,
    totalAmount DECIMAL(10,2) NOT NULL,
    createdAt DATETIME,
    updatedAt DATETIME,
    FOREIGN KEY (bookingId) REFERENCES bookings(_id)
);

-- Table des favoris
CREATE TABLE IF NOT EXISTS favorites (
    _id VARCHAR(24) PRIMARY KEY,
    userId VARCHAR(24) NOT NULL,
    boatId VARCHAR(24) NOT NULL,
    createdAt DATETIME,
    updatedAt DATETIME,
    FOREIGN KEY (userId) REFERENCES users(_id),
    FOREIGN KEY (boatId) REFERENCES boats(_id),
    UNIQUE KEY unique_user_boat (userId, boatId)
);

-- Table des disponibilités
CREATE TABLE IF NOT EXISTS availabilities (
    _id VARCHAR(24) PRIMARY KEY,
    boatId VARCHAR(24) NOT NULL,
    startDate DATE NOT NULL,
    endDate DATE NOT NULL,
    price DECIMAL(10,2),
    notes TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt DATETIME,
    updatedAt DATETIME,
    FOREIGN KEY (boatId) REFERENCES boats(_id)
);

-- =============================================
-- INSERTION DES DONNÉES
-- =============================================

`;

    // Export des utilisateurs
    console.log('Export des utilisateurs...');
    const users = await User.find({});
    if (users.length > 0) {
      sqlContent += '-- Données des utilisateurs\n';
      sqlContent += 'INSERT INTO users (_id, nom, prenom, email, password, tel, role, isProfessionnel, siret, siren, status, createdAt, updatedAt) VALUES\n';
      
      const userValues = users.map(user => 
        `(${formatObjectId(user._id)}, ${escapeString(user.nom)}, ${escapeString(user.prenom)}, ${escapeString(user.email)}, ${escapeString(user.password)}, ${escapeString(user.tel)}, ${escapeString(user.role)}, ${formatBoolean(user.isProfessionnel)}, ${escapeString(user.siret)}, ${escapeString(user.siren)}, ${escapeString(user.status)}, ${formatDate(user.createdAt)}, ${formatDate(user.updatedAt)})`
      ).join(',\n');
      
      sqlContent += userValues + ';\n\n';
    }

    // Export des bateaux
    console.log('Export des bateaux...');
    const boats = await Boat.find({});
    if (boats.length > 0) {
      sqlContent += '-- Données des bateaux\n';
      sqlContent += 'INSERT INTO boats (_id, nom, type, longueur, prix_jour, capacite, image, destination, description, equipements, disponible, availability, existingBookings, proprietaire, createdAt, updatedAt) VALUES\n';
      
      const boatValues = boats.map(boat => 
        `(${formatObjectId(boat._id)}, ${escapeString(boat.nom)}, ${escapeString(boat.type)}, ${formatNumber(boat.longueur)}, ${formatNumber(boat.prix_jour)}, ${formatNumber(boat.capacite)}, ${escapeString(boat.image)}, ${escapeString(boat.destination)}, ${escapeString(boat.description)}, ${formatArray(boat.equipements)}, ${formatBoolean(boat.disponible)}, ${formatArray(boat.availability)}, ${formatArray(boat.existingBookings)}, ${formatObjectId(boat.proprietaire)}, ${formatDate(boat.createdAt)}, ${formatDate(boat.updatedAt)})`
      ).join(',\n');
      
      sqlContent += boatValues + ';\n\n';
    }

    // Export des réservations
    console.log('Export des réservations...');
    const bookings = await Booking.find({});
    if (bookings.length > 0) {
      sqlContent += '-- Données des réservations\n';
      sqlContent += 'INSERT INTO bookings (_id, userId, boatId, startDate, endDate, totalPrice, status, paymentStatus, numberOfGuests, specialRequests, createdAt, updatedAt) VALUES\n';
      
      const bookingValues = bookings.map(booking => 
        `(${formatObjectId(booking._id)}, ${formatObjectId(booking.userId)}, ${formatObjectId(booking.boatId)}, ${formatDate(booking.startDate)}, ${formatDate(booking.endDate)}, ${formatNumber(booking.totalPrice)}, ${escapeString(booking.status)}, ${escapeString(booking.paymentStatus)}, ${formatNumber(booking.numberOfGuests)}, ${escapeString(booking.specialRequests)}, ${formatDate(booking.createdAt)}, ${formatDate(booking.updatedAt)})`
      ).join(',\n');
      
      sqlContent += bookingValues + ';\n\n';
    }

    // Export des avis
    console.log('Export des avis...');
    const reviews = await Review.find({});
    if (reviews.length > 0) {
      sqlContent += '-- Données des avis\n';
      sqlContent += 'INSERT INTO reviews (_id, userId, boatId, bookingId, rating, comment, helpful, createdAt, updatedAt) VALUES\n';
      
      const reviewValues = reviews.map(review => 
        `(${formatObjectId(review._id)}, ${formatObjectId(review.userId)}, ${formatObjectId(review.boatId)}, ${formatObjectId(review.bookingId)}, ${formatNumber(review.rating)}, ${escapeString(review.comment)}, ${formatNumber(review.helpful)}, ${formatDate(review.createdAt)}, ${formatDate(review.updatedAt)})`
      ).join(',\n');
      
      sqlContent += reviewValues + ';\n\n';
    }

    // Export des paiements
    console.log('Export des paiements...');
    const payments = await Payment.find({});
    if (payments.length > 0) {
      sqlContent += '-- Données des paiements\n';
      sqlContent += 'INSERT INTO payments (_id, bookingId, totalAmount, createdAt, updatedAt) VALUES\n';
      
      const paymentValues = payments.map(payment => 
        `(${formatObjectId(payment._id)}, ${formatObjectId(payment.bookingId)}, ${formatNumber(payment.totalAmount)}, ${formatDate(payment.createdAt)}, ${formatDate(payment.updatedAt)})`
      ).join(',\n');
      
      sqlContent += paymentValues + ';\n\n';
    }

    // Export des favoris
    console.log('Export des favoris...');
    const favorites = await Favorite.find({});
    if (favorites.length > 0) {
      sqlContent += '-- Données des favoris\n';
      sqlContent += 'INSERT INTO favorites (_id, userId, boatId, createdAt, updatedAt) VALUES\n';
      
      const favoriteValues = favorites.map(favorite => 
        `(${formatObjectId(favorite._id)}, ${formatObjectId(favorite.userId)}, ${formatObjectId(favorite.boatId)}, ${formatDate(favorite.createdAt)}, ${formatDate(favorite.updatedAt)})`
      ).join(',\n');
      
      sqlContent += favoriteValues + ';\n\n';
    }

    // Export des disponibilités
    console.log('Export des disponibilités...');
    const availabilities = await Availability.find({});
    if (availabilities.length > 0) {
      sqlContent += '-- Données des disponibilités\n';
      sqlContent += 'INSERT INTO availabilities (_id, boatId, startDate, endDate, price, notes, isActive, createdAt, updatedAt) VALUES\n';
      
      const availabilityValues = availabilities.map(availability => 
        `(${formatObjectId(availability._id)}, ${formatObjectId(availability.boatId)}, ${formatDate(availability.startDate)}, ${formatDate(availability.endDate)}, ${formatNumber(availability.price)}, ${escapeString(availability.notes)}, ${formatBoolean(availability.isActive)}, ${formatDate(availability.createdAt)}, ${formatDate(availability.updatedAt)})`
      ).join(',\n');
      
      sqlContent += availabilityValues + ';\n\n';
    }

    // Ajouter les index pour optimiser les performances
    sqlContent += `-- =============================================
-- INDEX POUR OPTIMISER LES PERFORMANCES
-- =============================================

-- Index sur les utilisateurs
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- Index sur les bateaux
CREATE INDEX idx_boats_proprietaire ON boats(proprietaire);
CREATE INDEX idx_boats_type ON boats(type);
CREATE INDEX idx_boats_destination ON boats(destination);
CREATE INDEX idx_boats_disponible ON boats(disponible);

-- Index sur les réservations
CREATE INDEX idx_bookings_userId ON bookings(userId);
CREATE INDEX idx_bookings_boatId ON bookings(boatId);
CREATE INDEX idx_bookings_dates ON bookings(startDate, endDate);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Index sur les avis
CREATE INDEX idx_reviews_boatId ON reviews(boatId);
CREATE INDEX idx_reviews_userId ON reviews(userId);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- Index sur les paiements
CREATE INDEX idx_payments_bookingId ON payments(bookingId);

-- Index sur les favoris
CREATE INDEX idx_favorites_userId ON favorites(userId);
CREATE INDEX idx_favorites_boatId ON favorites(boatId);

-- Index sur les disponibilités
CREATE INDEX idx_availabilities_boatId ON availabilities(boatId);
CREATE INDEX idx_availabilities_dates ON availabilities(startDate, endDate);

-- =============================================
-- FIN DE L'EXPORT
-- =============================================
`;

    // Créer le nom de fichier avec le format demandé
    const fileName = 'DEV_Classe_Groupe_bdd.sql';
    const filePath = path.join(process.cwd(), fileName);

    // Écrire le fichier
    fs.writeFileSync(filePath, sqlContent, 'utf8');
    
    console.log(`\n✅ Export terminé avec succès !`);
    console.log(`📁 Fichier généré : ${fileName}`);
    console.log(`📊 Statistiques :`);
    console.log(`   - ${users.length} utilisateurs`);
    console.log(`   - ${boats.length} bateaux`);
    console.log(`   - ${bookings.length} réservations`);
    console.log(`   - ${reviews.length} avis`);
    console.log(`   - ${payments.length} paiements`);
    console.log(`   - ${favorites.length} favoris`);
    console.log(`   - ${availabilities.length} disponibilités`);

  } catch (error) {
    console.error('❌ Erreur lors de l\'export :', error);
  } finally {
    // Fermer la connexion MongoDB
    await mongoose.connection.close();
    console.log('Connexion MongoDB fermée');
  }
}

// Exécuter l'export
exportDatabase();
