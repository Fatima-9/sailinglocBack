-- Export de la base de données SailingLoc
-- Généré le 11/09/2025 23:15:01
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

-- Données des utilisateurs
INSERT INTO users (_id, nom, prenom, email, password, tel, role, isProfessionnel, siret, siren, status, createdAt, updatedAt) VALUES
('68c2ea9a325a43d5bf40eba9', 'azzimani', 'fatima', 'fatima-prop@gmail.com', '$2b$10$ZjYi5bLR8Ue443FrMmtNXez724fmJXiQr5TCQqdMfHF9eBb83tmOG', '0766310617', 'proprietaire', 0, NULL, NULL, 'actif', '2025-09-11 15:28:26', '2025-09-11 15:28:26'),
('68c2eac7325a43d5bf40ebac', 'azzimani', 'fatima', 'fatima-client@gmail.com', '$2b$10$ELYV7pIEv9UqSxxRxO5pleW8QpzgdBdPCdKrv35t7Lbxyi0gP.AIy', '0766310617', 'client', 0, NULL, NULL, 'actif', '2025-09-11 15:29:11', '2025-09-11 15:29:11'),
('68c3365df98fa02809479896', 'Admin', 'Système', 'sailinglocequipe@gmail.com', '$2b$10$VKv2QTYvMU0K.XwIdjnZsevK14f25kfoGnm95sVMshuYtg9CHigMq', '+33123456789', 'admin', 0, NULL, NULL, 'actif', '2025-09-11 20:51:41', '2025-09-11 20:51:41');

-- Données des bateaux
INSERT INTO boats (_id, nom, type, longueur, prix_jour, capacite, image, destination, description, equipements, disponible, availability, existingBookings, proprietaire, createdAt, updatedAt) VALUES
('68c2eb41fc21301cce88ac42', 'Etoile des mers', 'voilier', 5, 1000, 4, 'https://firebasestorage.googleapis.com/v0/b/mypictures-9dc8b.firebasestorage.app/o/boats%2F1757604671612_voilier%201.jpeg?alt=media&token=99734edf-7ce9-414c-94fa-0daae11b1298', 'saint-malo', 'Balade amis', '["Gilets de sauvetage"]', 1, NULL, '[]', '68c2ea9a325a43d5bf40eba9', '2025-09-11 15:31:13', '2025-09-11 15:31:13'),
('68c2ebb7fc21301cce88ac4b', 'Le rouge', 'yacht', 5, 1500, 10, 'https://firebasestorage.googleapis.com/v0/b/mypictures-9dc8b.firebasestorage.app/o/boats%2F1757604791124_OIP%20(1).webp?alt=media&token=038545d3-2238-4494-b25c-0c3c6e55505f', 'marseille', 'magnifique', '["Salle de bain","Cuisine équipée","GPS","Équipement de pêche","Gilets de sauvetage","Panneaux solaires"]', 1, NULL, '[]', '68c2ea9a325a43d5bf40eba9', '2025-09-11 15:33:11', '2025-09-11 15:33:11'),
('68c2ec2efc21301cce88ac53', 'Sharq', 'catamaran', 9, 3500, 20, 'https://firebasestorage.googleapis.com/v0/b/mypictures-9dc8b.firebasestorage.app/o/boats%2F1757604910095_catamaran%201.webp?alt=media&token=a585f8c8-632d-45ac-8aba-c7166d282a0a', 'venise', 'Goo', '["Wifi","Climatisation","Salle de bain","Panneaux solaires","Gilets de sauvetage","Cuisine équipée","GPS"]', 1, NULL, '[]', '68c2ea9a325a43d5bf40eba9', '2025-09-11 15:35:10', '2025-09-11 15:35:10'),
('68c2ec9cfc21301cce88ac5b', 'Beauty-boat', 'yacht', 10, 1200, 6, 'https://firebasestorage.googleapis.com/v0/b/mypictures-9dc8b.firebasestorage.app/o/boats%2F1757605019732_bateau%20a%20moteur%203.webp?alt=media&token=b7fb1a39-9c8e-4bd8-903e-0e692ec94945', 'cannes', 'SUPER', '["Gilets de sauvetage"]', 1, NULL, '[]', '68c2ea9a325a43d5bf40eba9', '2025-09-11 15:37:00', '2025-09-11 15:37:00'),
('68c2ed0a6dff15c691a29f29', 'Luna', 'yacht', 10, 4000, 20, 'https://firebasestorage.googleapis.com/v0/b/mypictures-9dc8b.firebasestorage.app/o/boats%2F1757605130308_OIP.webp?alt=media&token=36841321-fca8-4eb1-919a-1405c2598554', 'barcelone', 'SUPER', '["Wifi","Gilets de sauvetage","GPS","Cuisine équipée"]', 1, NULL, '[]', '68c2ea9a325a43d5bf40eba9', '2025-09-11 15:38:50', '2025-09-11 15:38:50'),
('68c2edd26dff15c691a29f2e', 'Capitaine', 'yacht', 8, 500, 3, 'https://firebasestorage.googleapis.com/v0/b/mypictures-9dc8b.firebasestorage.app/o/boats%2F1757605328827_bateau%20a%20moteur%202.jpeg?alt=media&token=1a220ff8-e5dd-49dc-ab96-fc46ea1b1333', 'amsterdam', 'Go', '[]', 1, NULL, '[]', '68c2ea9a325a43d5bf40eba9', '2025-09-11 15:42:10', '2025-09-11 15:42:10');

-- Données des réservations
INSERT INTO bookings (_id, userId, boatId, startDate, endDate, totalPrice, status, paymentStatus, numberOfGuests, specialRequests, createdAt, updatedAt) VALUES
('68bda9cb123bfa7e404276d2', '68bc250f7f2a913355fc62f2', '68bd4440199198ee4e82a635', '2025-09-17 00:00:00', '2025-09-18 00:00:00', 500, 'pending', 'paid', 1, '', '2025-09-07 15:50:35', '2025-09-07 15:50:35'),
('68bda9d2e703333942053d56', '68a5a1b15f608ef0d4f3e685', '68b46bfe1794b2482de0784c', '2025-09-11 00:00:00', '2025-09-11 00:00:00', 1000, 'pending', 'paid', 1, '', '2025-09-07 15:50:42', '2025-09-07 15:50:42'),
('68bdaa4fed71cabe506fa60c', '68bc250f7f2a913355fc62f2', '68bd4440199198ee4e82a635', '2025-09-07 00:00:00', '2025-09-08 00:00:00', 500, 'pending', 'paid', 1, '', '2025-09-07 15:52:47', '2025-09-07 15:52:47'),
('68bdaa54ed71cabe506fa611', '68a5a1b15f608ef0d4f3e685', '68b46bfe1794b2482de0784c', '2025-09-12 00:00:00', '2025-09-12 00:00:00', 1000, 'pending', 'paid', 1, '', '2025-09-07 15:52:52', '2025-09-07 15:52:52'),
('68bdab0200b51d4387c3fbd5', '68bc250f7f2a913355fc62f2', '68bd4440199198ee4e82a635', '2025-09-14 00:00:00', '2025-09-15 00:00:00', 500, 'confirmed', 'paid', 1, '', '2025-09-07 15:55:46', '2025-09-07 15:56:01'),
('68bdab2b128520961f9eba5f', '68a5a1b15f608ef0d4f3e685', '68b46bfe1794b2482de0784c', '2025-09-13 00:00:00', '2025-09-13 00:00:00', 1000, 'confirmed', 'paid', 1, '', '2025-09-07 15:56:27', '2025-09-07 15:56:37'),
('68c2eeda7fe653b27bd8a21d', '68c2ea9a325a43d5bf40eba9', '68c2ebb7fc21301cce88ac4b', '2025-09-15 00:00:00', '2025-09-19 00:00:00', 6000, 'cancelled', 'paid', 1, '', '2025-09-11 15:46:34', '2025-09-11 15:46:53'),
('68c2ef0d7fe653b27bd8a244', '68c2ea9a325a43d5bf40eba9', '68c2ebb7fc21301cce88ac4b', '2025-09-23 00:00:00', '2025-09-25 00:00:00', 3000, 'confirmed', 'paid', 1, '', '2025-09-11 15:47:25', '2025-09-11 15:47:33'),
('68c2ef50102f2eb826065f35', '68c2eac7325a43d5bf40ebac', '68c2ebb7fc21301cce88ac4b', '2025-09-26 00:00:00', '2025-09-28 00:00:00', 3000, 'confirmed', 'paid', 1, '', '2025-09-11 15:48:32', '2025-09-11 15:48:48'),
('68c2f01c7fe653b27bd8a268', '68c2eac7325a43d5bf40ebac', '68c2eb41fc21301cce88ac42', '2025-09-20 00:00:00', '2025-09-20 00:00:00', 1000, 'confirmed', 'paid', 1, '', '2025-09-11 15:51:56', '2025-09-11 15:52:10');

-- Données des avis
INSERT INTO reviews (_id, userId, boatId, bookingId, rating, comment, helpful, createdAt, updatedAt) VALUES
('68c2ef85325a43d5bf40ebc2', '68c2eac7325a43d5bf40ebac', '68c2ebb7fc21301cce88ac4b', NULL, 5, 'SUPER Goooooooooood', 0, '2025-09-11 15:49:25', '2025-09-11 15:49:25');

-- Données des paiements
INSERT INTO payments (_id, bookingId, totalAmount, createdAt, updatedAt) VALUES
('68a4682548bcd13cd6b198bc', '68a4682548bcd13cd6b198ba', 1500, '2025-08-19 12:03:49', '2025-08-19 12:03:49'),
('68a46fbaa2961b039a382438', '68a46fb9a2961b039a382436', 500, '2025-08-19 12:36:10', '2025-08-19 12:36:10'),
('68a473db5a45de35b8df6da7', '68a473db5a45de35b8df6da5', 500, '2025-08-19 12:53:47', '2025-08-19 12:53:47'),
('68a474e75a45de35b8df6de0', '68a474e75a45de35b8df6dde', 750, '2025-08-19 12:58:15', '2025-08-19 12:58:15'),
('68a4882a65e2897f255fcb90', '68a4882965e2897f255fcb8e', 3600, '2025-08-19 14:20:26', '2025-08-19 14:20:26'),
('68a4902f1ec67ed3d3f52584', '68a4902e1ec67ed3d3f52582', 1600, '2025-08-19 14:54:39', '2025-08-19 14:54:39'),
('68a490931ec67ed3d3f5258e', '68a490921ec67ed3d3f5258c', 400, '2025-08-19 14:56:19', '2025-08-19 14:56:19'),
('68a57a641ec67ed3d3f525da', '68a57a641ec67ed3d3f525d8', 400, '2025-08-20 07:33:56', '2025-08-20 07:33:56'),
('68a57b871ec67ed3d3f52660', '68a57b861ec67ed3d3f5265e', 800, '2025-08-20 07:38:47', '2025-08-20 07:38:47'),
('68a5a2f8d04d4ef7646d8bb5', '68a5a2f7d04d4ef7646d8bb3', 500, '2025-08-20 10:27:04', '2025-08-20 10:27:04'),
('68a5a364d04d4ef7646d8bdd', '68a5a363d04d4ef7646d8bdb', 500, '2025-08-20 10:28:52', '2025-08-20 10:28:52'),
('68a5bdae2ef1e7566d8b9c71', '68a5bdae2ef1e7566d8b9c6f', 4000, '2025-08-20 12:21:02', '2025-08-20 12:21:02'),
('68a5c841a5ec5b1769730bbe', '68a5c840a5ec5b1769730bbc', 2000, '2025-08-20 13:06:09', '2025-08-20 13:06:09'),
('68a5c94ca5ec5b1769730bc8', '68a5c94ba5ec5b1769730bc6', 2000, '2025-08-20 13:10:36', '2025-08-20 13:10:36'),
('68a5c9d0a5ec5b1769730c20', '68a5c9d0a5ec5b1769730c1e', 500, '2025-08-20 13:12:48', '2025-08-20 13:12:48'),
('68a5c9f3a5ec5b1769730c4c', '68a5c9f3a5ec5b1769730c4a', 500, '2025-08-20 13:13:23', '2025-08-20 13:13:23'),
('68a5cbeac0ae611b62881858', '68a5cbe9c0ae611b62881856', 500, '2025-08-20 13:21:46', '2025-08-20 13:21:46'),
('68a5cc9cc0ae611b628818a4', '68a5cc9bc0ae611b628818a2', 500, '2025-08-20 13:24:44', '2025-08-20 13:24:44'),
('68a5ce20c0ae611b628818b2', '68a5ce1fc0ae611b628818b0', 500, '2025-08-20 13:31:12', '2025-08-20 13:31:12'),
('68a5ce75c0ae611b628818de', '68a5ce75c0ae611b628818dc', 500, '2025-08-20 13:32:37', '2025-08-20 13:32:37'),
('68a5d133c0ae611b628818f8', '68a5d132c0ae611b628818f6', 500, '2025-08-20 13:44:19', '2025-08-20 13:44:19'),
('68a5d14bd3123e9581d9d49b', '68a5d14ad3123e9581d9d499', 1000, '2025-08-20 13:44:43', '2025-08-20 13:44:43'),
('68a5d974fa611c3dace82319', '68a5d973fa611c3dace82317', 1500, '2025-08-20 14:19:32', '2025-08-20 14:19:32'),
('68a5d99ffa611c3dace82341', '68a5d99ffa611c3dace8233f', 1500, '2025-08-20 14:20:15', '2025-08-20 14:20:15'),
('68a5db5b4447548c788eb466', '68a5db594447548c788eb464', 1500, '2025-08-20 14:27:39', '2025-08-20 14:27:39'),
('68a6440cf471603f1b260cb2', '68a6440cf471603f1b260cb0', 680, '2025-08-20 21:54:20', '2025-08-20 21:54:20'),
('68a78a940b188c006932e4a4', '68a78a930b188c006932e4a2', 500, '2025-08-21 21:07:32', '2025-08-21 21:07:32'),
('68a876a211b732ffe4c84211', '68a876a111b732ffe4c8420f', 500, '2025-08-22 13:54:42', '2025-08-22 13:54:42'),
('68ac5f3accd5eadd5363acf8', '68ac5f39ccd5eadd5363acf6', 680, '2025-08-25 13:03:54', '2025-08-25 13:03:54'),
('68ac6015ccd5eadd5363ad3e', '68ac6014ccd5eadd5363ad3c', 22, '2025-08-25 13:07:33', '2025-08-25 13:07:33'),
('68ac62c6342f5c98333b8169', '68ac62c5342f5c98333b8167', 22, '2025-08-25 13:19:02', '2025-08-25 13:19:02'),
('68ac662510a5f8022c1b0c1d', '68ac662410a5f8022c1b0c1b', 22, '2025-08-25 13:33:25', '2025-08-25 13:33:25'),
('68ac6d6ffdcd331362111707', '68ac6d6efdcd331362111705', 22, '2025-08-25 14:04:31', '2025-08-25 14:04:31'),
('68ac7776c6093e4dcf133056', '68ac7775c6093e4dcf133054', 22, '2025-08-25 14:47:18', '2025-08-25 14:47:18'),
('68ac78e6c6093e4dcf1330f5', '68ac78e5c6093e4dcf1330f3', 220, '2025-08-25 14:53:26', '2025-08-25 14:53:26'),
('68ac7904c6093e4dcf133102', '68ac7904c6093e4dcf133100', 110, '2025-08-25 14:53:56', '2025-08-25 14:53:56'),
('68ac7a17c6093e4dcf133155', '68ac7a16c6093e4dcf133153', 1500, '2025-08-25 14:58:31', '2025-08-25 14:58:31'),
('68ac7aa4c6093e4dcf133178', '68ac7aa3c6093e4dcf133176', 500, '2025-08-25 15:00:52', '2025-08-25 15:00:52'),
('68ac7afcc6093e4dcf1331b2', '68ac7afcc6093e4dcf1331b0', 1500, '2025-08-25 15:02:20', '2025-08-25 15:02:20'),
('68ac7cbea650b5487edc97a5', '68ac7cbda650b5487edc97a3', 500, '2025-08-25 15:09:50', '2025-08-25 15:09:50'),
('68b46c561794b2482de07879', '68b46c551794b2482de07877', 40, '2025-08-31 15:37:58', '2025-08-31 15:37:58'),
('68b46d1c1794b2482de078c3', '68b46d1c1794b2482de078c1', 20, '2025-08-31 15:41:16', '2025-08-31 15:41:16'),
('68b46ebc1794b2482de07954', '68b46ebc1794b2482de07952', 10, '2025-08-31 15:48:12', '2025-08-31 15:48:12'),
('68b470055bb82c3e9cb4e25d', '68b470055bb82c3e9cb4e25b', 10, '2025-08-31 15:53:41', '2025-08-31 15:53:41'),
('68b470a05bb82c3e9cb4e2b0', '68b4709f5bb82c3e9cb4e2ae', 10, '2025-08-31 15:56:16', '2025-08-31 15:56:16'),
('68b471315bb82c3e9cb4e2fd', '68b471315bb82c3e9cb4e2fb', 10, '2025-08-31 15:58:41', '2025-08-31 15:58:41'),
('68b472d6e4c1231d398101cf', '68b472d5e4c1231d398101cd', 40, '2025-08-31 16:05:42', '2025-08-31 16:05:42'),
('68b48994980a65a4952eaf9e', '68b48993980a65a4952eaf9c', 10, '2025-08-31 17:42:44', '2025-08-31 17:42:44'),
('68b48d76980a65a4952eb132', '68b48d76980a65a4952eb130', 10, '2025-08-31 17:59:18', '2025-08-31 17:59:18'),
('68bb269abcc82da9b400497e', '68bb269abcc82da9b400497c', 10, '2025-09-05 18:06:18', '2025-09-05 18:06:18'),
('68bc27697f2a913355fc639e', '68bc27697f2a913355fc639c', 10, '2025-09-06 12:22:01', '2025-09-06 12:22:01'),
('68bc28445378bf719c1a2d99', '68bc28435378bf719c1a2d97', 10, '2025-09-06 12:25:40', '2025-09-06 12:25:40'),
('68bc4b2ed45c0804fe85957b', '68bc4b2ed45c0804fe859579', 10, '2025-09-06 14:54:38', '2025-09-06 14:54:38'),
('68bd45201ac2e2a6356fc99f', '68bd451f1ac2e2a6356fc99d', 500, '2025-09-07 08:41:04', '2025-09-07 08:41:04'),
('68bd767cd7c1586feb8f46a6', '68bd767cd7c1586feb8f46a4', 500, '2025-09-07 12:11:40', '2025-09-07 12:11:40'),
('68bd89d80b67e4ca93718c36', '68bd89d80b67e4ca93718c34', 1000, '2025-09-07 13:34:16', '2025-09-07 13:34:16'),
('68bd8a1226a3076c79921061', '68bd8a1126a3076c7992105f', 1000, '2025-09-07 13:35:14', '2025-09-07 13:35:14'),
('68bd8b076f5a30fb8112fa9c', '68bd8b066f5a30fb8112fa9a', 1000, '2025-09-07 13:39:19', '2025-09-07 13:39:19'),
('68bd8b966f5a30fb8112fab2', '68bd8b966f5a30fb8112fab0', 1000, '2025-09-07 13:41:42', '2025-09-07 13:41:42'),
('68bd8bc41d6f058302988c72', '68bd8bc31d6f058302988c70', 1000, '2025-09-07 13:42:28', '2025-09-07 13:42:28'),
('68bd8f923e9a06b60c66f835', '68bd8f913e9a06b60c66f833', 1000, '2025-09-07 13:58:42', '2025-09-07 13:58:42'),
('68bd9887092d75e06ce0d61e', '68bd9887092d75e06ce0d61c', 1000, '2025-09-07 14:36:55', '2025-09-07 14:36:55'),
('68bd99122a9b1f2f1649c818', '68bd99112a9b1f2f1649c816', 1000, '2025-09-07 14:39:14', '2025-09-07 14:39:14'),
('68bd9986ceb7878168fc301a', '68bd9985ceb7878168fc3018', 500, '2025-09-07 14:41:10', '2025-09-07 14:41:10'),
('68bd99b6ceb7878168fc3032', '68bd99b6ceb7878168fc3030', 1000, '2025-09-07 14:41:58', '2025-09-07 14:41:58'),
('68bd9c2cba2c1b6244845a34', '68bd9c2bba2c1b6244845a32', 1000, '2025-09-07 14:52:28', '2025-09-07 14:52:28'),
('68bda338c26352e98af50d01', '68bda338c26352e98af50cff', 500, '2025-09-07 15:22:32', '2025-09-07 15:22:32'),
('68bda39c68c9855a8a416c8c', '68bda39c68c9855a8a416c8a', 200, '2025-09-07 15:24:12', '2025-09-07 15:24:12'),
('68bda39f68c9855a8a416c93', '68bda39f68c9855a8a416c91', 1000, '2025-09-07 15:24:15', '2025-09-07 15:24:15'),
('68bda3d268c9855a8a416cb2', '68bda3d168c9855a8a416cb0', 500, '2025-09-07 15:25:06', '2025-09-07 15:25:06'),
('68bda4e270ca4e947671e1f7', '68bda4e270ca4e947671e1f5', 1000, '2025-09-07 15:29:38', '2025-09-07 15:29:38'),
('68bda5624bd311090e3893cf', '68bda5614bd311090e3893cd', 500, '2025-09-07 15:31:46', '2025-09-07 15:31:46'),
('68bdab0200b51d4387c3fbd7', '68bdab0200b51d4387c3fbd5', 500, '2025-09-07 15:55:46', '2025-09-07 15:55:46'),
('68bdab2c128520961f9eba61', '68bdab2b128520961f9eba5f', 1000, '2025-09-07 15:56:28', '2025-09-07 15:56:28'),
('68c2eeda7fe653b27bd8a21f', '68c2eeda7fe653b27bd8a21d', 6000, '2025-09-11 15:46:34', '2025-09-11 15:46:34'),
('68c2ef0d7fe653b27bd8a246', '68c2ef0d7fe653b27bd8a244', 3000, '2025-09-11 15:47:25', '2025-09-11 15:47:25'),
('68c2ef50102f2eb826065f37', '68c2ef50102f2eb826065f35', 3000, '2025-09-11 15:48:32', '2025-09-11 15:48:32'),
('68c2f01d7fe653b27bd8a26a', '68c2f01c7fe653b27bd8a268', 1000, '2025-09-11 15:51:57', '2025-09-11 15:51:57');

-- Données des favoris
INSERT INTO favorites (_id, userId, boatId, createdAt, updatedAt) VALUES
('68a4329fff790aeed8a96444', '687a557c547b8ca1af59b6ae', '68a0a56d1e445751864290e8', '2025-08-19 08:15:27', '2025-08-19 08:15:27'),
('68a57b481ec67ed3d3f5260a', '6898a20fc6018cc5129e5f33', '68a0a2e51e445751864290de', '2025-08-20 07:37:44', '2025-08-20 07:37:44'),
('68b48a35980a65a4952eb004', '68a5a1b15f608ef0d4f3e685', '68b46bfe1794b2482de0784c', '2025-08-31 17:45:25', '2025-08-31 17:45:25'),
('68b48a6b980a65a4952eb037', '68a5cc76c0ae611b62881881', '68b46bfe1794b2482de0784c', '2025-08-31 17:46:19', '2025-08-31 17:46:19'),
('68b865f7e6ffa483a47397f0', '68b7296459cb2640baa8b258', '68b46bfe1794b2482de0784c', '2025-09-03 15:59:51', '2025-09-03 15:59:51'),
('68bd70898545ba39f2359e18', '68bc250f7f2a913355fc62f2', '68bd4440199198ee4e82a635', '2025-09-07 11:46:17', '2025-09-07 11:46:17'),
('68bd8fd3d2575da71f0f9870', '68a5a1b15f608ef0d4f3e685', '68bd4440199198ee4e82a635', '2025-09-07 13:59:47', '2025-09-07 13:59:47'),
('68bd8fd4d2575da71f0f9874', '68a5a1b15f608ef0d4f3e685', '68bd8e2e3e9a06b60c66f810', '2025-09-07 13:59:48', '2025-09-07 13:59:48'),
('68c2effe6dff15c691a29f4d', '68c2eac7325a43d5bf40ebac', '68c2ebb7fc21301cce88ac4b', '2025-09-11 15:51:26', '2025-09-11 15:51:26'),
('68c2f0056dff15c691a29f51', '68c2eac7325a43d5bf40ebac', '68c2ed0a6dff15c691a29f29', '2025-09-11 15:51:33', '2025-09-11 15:51:33'),
('68c2f0096dff15c691a29f55', '68c2eac7325a43d5bf40ebac', '68c2eb41fc21301cce88ac42', '2025-09-11 15:51:37', '2025-09-11 15:51:37');

-- =============================================
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
