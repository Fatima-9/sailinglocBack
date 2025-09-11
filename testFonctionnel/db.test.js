import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';

// Charger les variables d'environnement AVANT les tests
dotenv.config();

describe('Database Connection Tests', () => {
  beforeAll(async () => {
    // Configuration pour les tests
    process.env.NODE_ENV = 'test';
    
    // Vérifier que MONGO_URI est définie
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined. Please check your .env file.');
    }
    
    // Connexion à la base de données
    try {
      await connectDB();
    } catch (error) {
      throw error;
    }
  });

  afterAll(async () => {
    // Fermer la connexion après les tests
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.connection.close();
      } catch (error) {
        // Ignorer les erreurs de fermeture
      }
    }
  });

  describe('Connexion à la base de données', () => {
    test('devrait se connecter à MongoDB avec succès', async () => {
      expect(mongoose.connection.readyState).toBe(1); // 1 = connecté
      expect(mongoose.connection.host).toBeDefined();
      expect(mongoose.connection.name).toBeDefined();
      expect(mongoose.connection.port).toBeDefined();
    });

    test('devrait avoir une connexion active', () => {
      const readyState = mongoose.connection.readyState;
      expect([1, 2]).toContain(readyState); // 1 = connecté, 2 = en cours de connexion
    });

    test('devrait avoir les bonnes informations de connexion', () => {
      const connectionInfo = mongoose.connection;
      
      // Vérifier que les propriétés de connexion existent
      expect(connectionInfo.host).toBeTruthy();
      expect(connectionInfo.name).toBeTruthy();
      expect(connectionInfo.port).toBeTruthy();
      
      // Vérifier que l'URL de connexion est définie
      expect(connectionInfo.client).toBeDefined();
    });
  });

  describe('Opérations de base de données', () => {
    test('devrait pouvoir exécuter une requête simple', async () => {
      try {
        // Test d'une requête simple pour vérifier que la connexion fonctionne
        const result = await mongoose.connection.db.admin().ping();
        expect(result.ok).toBe(1);
      } catch (error) {
        fail(`Erreur lors de l'exécution de la requête ping: ${error.message}`);
      }
    });

    test('devrait pouvoir lister les collections', async () => {
      try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        expect(Array.isArray(collections)).toBe(true);
        expect(collections.length).toBeGreaterThan(0);
      } catch (error) {
        fail(`Erreur lors de la liste des collections: ${error.message}`);
      }
    });

    test('devrait pouvoir accéder à la base de données', () => {
      // Test plus simple : vérifier que la base de données est accessible
      const db = mongoose.connection.db;
      expect(db).toBeDefined();
      expect(db.databaseName).toBeDefined();
      expect(typeof db.databaseName).toBe('string');
    });
  });

  describe('Variables d\'environnement', () => {
    test('devrait avoir les variables d\'environnement nécessaires', () => {
      // Vérifier que les variables d'environnement sont définies
      expect(process.env.NODE_ENV).toBeDefined();
      expect(process.env.MONGO_URI).toBeDefined();
    });

    test('devrait utiliser la bonne base de données', () => {
      const dbName = mongoose.connection.name;
      expect(dbName).toBeTruthy();
    });
  });
});
