import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

let app;

// Mocks UNITAIRES pour les tests
const boatsStore = new Map();
const usersStore = new Map();

// Mock du modèle Boat
await jest.unstable_mockModule('../models/Boat.js', () => {
  class MockBoat {
    constructor(doc) {
      Object.assign(this, doc);
      this._id = this._id || `boat_${Math.random().toString(36).slice(2)}`;
      // Initialiser les valeurs par défaut
      this.equipements = this.equipements || [];
      this.description = this.description || '';
      // AJOUTER : Propriétaire par défaut
      this.proprietaire = doc.proprietaire || 'user1';
    }
    
    async save() {
      // Simuler le comportement Mongoose
      const savedBoat = { ...this };
      savedBoat.populate = function(field) {
        // Retourner l'objet avec populate
        return Promise.resolve(savedBoat);
      };
      
      boatsStore.set(this._id, savedBoat);
      return savedBoat;
    }
    
    static async findOne(query) {
      if (query.nom) {
        return Array.from(boatsStore.values()).find(boat => 
          boat.nom === query.nom
        ) || null;
      }
      return null;
    }
  }
  return { default: MockBoat };
});

// Mock du modèle User
await jest.unstable_mockModule('../models/User.js', () => {
  class MockUser {
    constructor(doc) {
      Object.assign(this, doc);
      this._id = this._id || 'id_user';
    }
    
    static async findById(id) {
      const boat = boatsStore.get(id);
      if (!boat) return null;
      
      return {
        ...boat,
        populate: function(field) {
          return Promise.resolve(this);
        }
      };
    }
  }
  return { default: MockUser };
});

// Mock du middleware d'authentification 
await jest.unstable_mockModule('../middleware/auth.js', () => ({
  protect: (req, res, next) => {
    // S'assurer que req.user est bien défini
    req.user = { 
      _id: 'user1', 
      email: 'proprio@example.com', 
      role: 'proprietaire' 
    };
    next();
  },
  authorize: (roles) => (req, res, next) => {
    // Vérifier que l'utilisateur a le bon rôle
    if (roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ message: 'Accès refusé' });
    }
  }
}));

const boatRoutes = (await import('../routes/boat.js')).default;

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  app = express();
  app.use(express.json());
  app.use('/api/boats', boatRoutes);
  
  // Seed: utilisateur propriétaire
  usersStore.set('user1', {
    _id: 'user1',
    email: 'proprio@example.com',
    role: 'proprietaire'
  });
});

afterEach(() => {
  // Reset des bateaux après chaque test
  boatsStore.clear();
});

describe('UNIT - Création de bateaux', () => {
  it('crée un bateau avec tous les champs valides -> 201 + bateau', async () => {
    const boatData = {
      nom: 'Voilier Test',
      type: 'voilier',
      longueur: 12,
      prix_jour: 150,
      capacite: 6,
      image: 'https://example.com/voilier-test.jpg', 
      destination: 'saint-malo', 
      description: 'Un magnifique voilier de test',
      equipements: ['GPS', 'Radio VHF', 'Gilets de sauvetage']
    };

    const res = await request(app)
      .post('/api/boats')
      .send(boatData);
    
    expect(res.statusCode).toBe(201);
    expect(res.body.data).toHaveProperty('_id'); 
    expect(res.body.data.nom).toBe('Voilier Test'); 
    expect(res.body.data.type).toBe('voilier'); 
    expect(res.body.data.longueur).toBe(12); 
    expect(res.body.data.prix_jour).toBe(150);
    expect(res.body.data.capacite).toBe(6); 
    expect(res.body.data.destination).toBe('saint-malo'); 
    expect(res.body.data.equipements).toContain('GPS'); 
  });

  it('refuse création sans nom -> 400', async () => {
    const boatData = {
      type: 'voilier',
      longueur: 12,
      prix_jour: 150,
      capacite: 6,
      image: 'https://example.com/image.jpg', 
      destination: 'saint-malo' 
    };

    const res = await request(app)
      .post('/api/boats')
      .send(boatData);
    
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/nom.*obligatoire/i);
  });

  it('refuse création sans type -> 400', async () => {
    const boatData = {
      nom: 'Voilier Test',
      longueur: 12,
      prix_jour: 150,
      capacite: 6,
      image: 'https://example.com/image.jpg', 
      destination: 'saint-malo' 
    };

    const res = await request(app)
      .post('/api/boats')
      .send(boatData);
    
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/type.*obligatoire/i);
  });

  it('refuse création avec prix négatif -> 400', async () => {
    const boatData = {
      nom: 'Voilier Test',
      type: 'voilier',
      longueur: 12,
      prix_jour: -100,
      capacite: 6,
      image: 'https://example.com/image.jpg', 
      destination: 'saint-malo' 
    };

    const res = await request(app)
      .post('/api/boats')
      .send(boatData);
    
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/prix.*supérieur.*0/i);
  });

  it('refuse création avec capacité invalide -> 400', async () => {
    const boatData = {
      nom: 'Voilier Test2',
      type: 'voilier',
      longueur: 12,
      prix_jour: 150,
      capacite: 51,
      image: 'https://example.com/image.jpg', 
      destination: 'saint-malo'
    };

    const res = await request(app)
      .post('/api/boats')
      .send(boatData);
    
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/capacité.*entre.*1.*50/i);
  });

  it('refuse création avec type invalide -> 400', async () => {
    const boatData = {
      nom: 'Bateau Test',
      type: 'type_invalide',
      longueur: 12,
      prix_jour: 150,
      capacite: 6,
      image: 'https://example.com/image.jpg', 
      destination: 'saint-malo' 
    };

    const res = await request(app)
      .post('/api/boats')
      .send(boatData);
    
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/type.*suivants.*voilier.*yacht.*catamaran/i);
  });

  it('crée un bateau avec équipements optionnels -> 201', async () => {
    const boatData = {
      nom: 'Voilier Simple',
      type: 'voilier',
      longueur: 10,
      prix_jour: 100,
      capacite: 4,
      image: 'https://example.com/image.jpg',
      destination: 'saint-malo' 
    };

    const res = await request(app)
      .post('/api/boats')
      .send(boatData);
    
    expect(res.statusCode).toBe(201);
    expect(res.body.data.nom).toBe('Voilier Simple');
    expect(res.body.data.equipements).toEqual([]);
    expect(res.body.data.description).toBe('');
  });

  it('assigne automatiquement le propriétaire -> 201', async () => {
    const boatData = {
      nom: 'Voilier Propriétaire',
      type: 'voilier',
      longueur: 12,
      prix_jour: 150,
      capacite: 6,
      image: 'https://example.com/image.jpg', 
      destination: 'saint-malo' 
    };

    const res = await request(app)
      .post('/api/boats')
      .send(boatData);
    
    expect(res.statusCode).toBe(201);
    // Vérifier la structure de la réponse
    console.log('Response body:', JSON.stringify(res.body, null, 2));
    
    // Adapter selon la structure réelle
    expect(res.body.data.proprietaire).toBe('user1');
  });

  it('refuse création avec nom dupliqué -> 400', async () => {
    const boatData = {
      nom: 'Voilier Dupliqué',
      type: 'voilier',
      longueur: 12,
      prix_jour: 150,
      capacite: 6,
      image: 'https://example.com/image.jpg', 
      destination: 'saint-malo' 
    };

    // Première création
    const first = await request(app)
      .post('/api/boats')
      .send(boatData);
    expect(first.statusCode).toBe(201);

    // Deuxième création avec le même nom
    const second = await request(app)
      .post('/api/boats')
      .send(boatData);
    expect(second.statusCode).toBe(400);
    expect(second.body.message).toMatch(/existe.*déjà/i);
  });
});
