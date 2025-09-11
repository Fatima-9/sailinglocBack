import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

let app;

// Stockage des bateaux de test
const boatsStore = new Map();

// Mock du modèle Boat - CORRECTION COMPLÈTE
await jest.unstable_mockModule('../models/Boat.js', () => {
  class MockBoat {
    constructor(doc) {
      Object.assign(this, doc);
      this._id = this._id || 'id_bateau';
    }
    
    // Méthode pour récupérer un bateau par ID avec populate
    static async findById(id) {
      const boat = boatsStore.get(id);
      if (!boat) return null;
      
      // CORRECTION : Créer un objet qui simule exactement la chaîne Mongoose
      const mockBoat = {
        ...boat,
        // Méthode populate qui retourne un objet avec populate
        populate: function(field) {
          // Simuler populate en retournant l'objet lui-même
          return Promise.resolve(this);
        }
      };
      
      return mockBoat;
    }
    
    // Méthode pour rechercher des bateaux avec filtres
    static async find(query = {}) {
      const allBoats = Array.from(boatsStore.values());
      
      // Si on filtre par destination, retourner seulement les bateaux correspondants
      if (query.destination) {
        return allBoats.filter(boat => 
          boat.destination === query.destination
        );
      }
      
      // Sinon retourner tous les bateaux
      return allBoats;
    }
  }
  
  return { default: MockBoat };
});

// Mock du middleware d'authentification - Permet l'accès sans token
await jest.unstable_mockModule('../middleware/auth.js', () => ({
  protect: (req, res, next) => next(),
  authorize: (roles) => (req, res, next) => next()
}));

// Import des routes de bateaux
const boatRoutes = (await import('../routes/boat.js')).default;

// Configuration initiale avant tous les tests
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  app = express();
  app.use(express.json());
  app.use('/api/boats', boatRoutes);
  
  // Création des bateaux de test
  boatsStore.set('boat1', {
    _id: 'boat1',
    nom: 'Voilier Élégance',
    type: 'voilier',
    longueur: 12,
    prix_jour: 150,
    capacite: 6,
    image: 'voilier-elegance.jpg',
    destination: 'saint-malo',  // Destination unique pour ce bateau
    description: 'Un magnifique voilier pour vos vacances',
    rating: 4.5,
    reviews: 12,
    proprietaire: 'user1'
  });
  
  boatsStore.set('boat2', {
    _id: 'boat2',
    nom: 'Catamaran Luxe',
    type: 'catamaran',
    longueur: 15,
    prix_jour: 250,
    capacite: 8,
    image: 'catamaran-luxe.jpg',
    destination: 'les-glenan',  // Destination différente pour tester le filtrage
    description: 'Catamaran de luxe avec tout le confort',
    rating: 4.8,
    reviews: 8,
    proprietaire: 'user2'
  });
});

// Nettoyage après chaque test
afterEach(() => {
  // Pas de nettoyage nécessaire pour ces tests
});

// Tests unitaires pour l'affichage des bateaux
describe('UNIT - Affichage des bateaux', () => {
  
  // Test 1 : Récupération d'un bateau spécifique par son ID
  it('récupère un bateau par ID -> 200 + données complètes', async () => {
    const res = await request(app).get('/api/boats/boat1');
    
    // Vérifier que la requête a réussi
    expect(res.statusCode).toBe(200);
    
    // Vérifier que toutes les données du bateau sont présentes
    expect(res.body._id).toBe('boat1');
    expect(res.body.nom).toBe('Voilier Élégance');
    expect(res.body.type).toBe('voilier');
    expect(res.body.prix_jour).toBe(150);
    expect(res.body.capacite).toBe(6);
    expect(res.body.destination).toBe('saint-malo');
    expect(res.body.rating).toBe(4.5);
    expect(res.body.reviews).toBe(12);
  });

  // Test 2 : Récupération de tous les bateaux disponibles
  it('récupère tous les bateaux -> 200 + liste', async () => {
    const res = await request(app).get('/api/boats');
    
    // Vérifier que la requête a réussi
    expect(res.statusCode).toBe(200);
    
    // Vérifier que la réponse contient bien un tableau avec 2 bateaux
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].nom).toBe('Voilier Élégance');
    expect(res.body[1].nom).toBe('Catamaran Luxe');
  });

  // Test 3 : Recherche de bateaux par destination spécifique
  it('recherche bateaux par destination -> 200 + résultats filtrés', async () => {
    const res = await request(app).get('/api/boats?destination=saint-malo');
    
    // Vérifier que la requête a réussi
    expect(res.statusCode).toBe(200);
    
    // Vérifier que la recherche retourne seulement 1 bateau (celui de saint-malo)
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].destination).toBe('saint-malo');
  });

  // Test 4 : Gestion des bateaux inexistants
  it('bateau inexistant -> 404', async () => {
    const res = await request(app).get('/api/boats/inexistant');
    
    // Vérifier que la requête retourne une erreur 404
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(/bateau.*trouvé/i);
  });

  // Test 5 : Vérification de la présence de tous les champs obligatoires
  it('affiche les informations essentielles du bateau', async () => {
    const res = await request(app).get('/api/boats/boat1');
    
    // Vérifier que la requête a réussi
    expect(res.statusCode).toBe(200);
    
    // Vérifier que tous les champs importants sont présents dans la réponse
    const boat = res.body;
    expect(boat).toHaveProperty('nom');
    expect(boat).toHaveProperty('type');
    expect(boat).toHaveProperty('longueur');
    expect(boat).toHaveProperty('prix_jour');
    expect(boat).toHaveProperty('capacite');
    expect(boat).toHaveProperty('image');
    expect(boat).toHaveProperty('destination');
    expect(boat).toHaveProperty('rating');
    expect(boat).toHaveProperty('reviews');
  });
});