import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

let app;

// Stockage des données de test
const paymentsStore = new Map();
const bookingsStore = new Map();
const boatsStore = new Map();

// Mock du modèle Payment 
await jest.unstable_mockModule('../models/Payment.js', () => {
  class MockPayment {
    constructor(doc) {
      Object.assign(this, doc);
      this._id = this._id || `payment_${Math.random().toString(36).slice(2)}`;
      this.status = this.status || 'pending';
      this.createdAt = this.createdAt || new Date();
    }
    
    async save() {
      paymentsStore.set(this._id, this);
      return this;
    }
    
    static async findById(id) {
      return paymentsStore.get(id) || null;
    }
    
    static async findOne(query) {
      if (query.bookingId) {
        return Array.from(paymentsStore.values()).find(payment => 
          payment.bookingId === query.bookingId
        ) || null;
      }
      return null;
    }
    
    // Ajouter la méthode create manquante
    static async create(paymentData) {
      const payment = new MockPayment(paymentData);
      paymentsStore.set(payment._id, payment);
      return payment;
    }
  }
  return { default: MockPayment };
});

// Mock du modèle Booking
await jest.unstable_mockModule('../models/Booking.js', () => {
  class MockBooking {
    constructor(doc) {
      Object.assign(this, doc);
      this._id = this._id || 'booking1';
    }
    
    static async findById(id) {
      return bookingsStore.get(id) || null;
    }
    
    static async create(bookingData) {
      // Simuler la création d'une réservation
      const booking = new MockBooking(bookingData);
      bookingsStore.set(booking._id, booking);
      return booking;
    }
  }
  return { default: MockBooking };
});

// Mock du modèle Boat
await jest.unstable_mockModule('../models/Boat.js', () => {
  class MockBoat {
    constructor(doc) {
      Object.assign(this, doc);
      this._id = this._id || 'id_bateau';
    }
    
    static async findById(id) {
      const boat = boatsStore.get(id);
      if (!boat) return null;
      return boat;
    }
    
    static async find(query = {}) {
      // Simule la recherche de bateaux
      const allBoats = Array.from(boatsStore.values());
      if (query.destination) {
        return allBoats.filter(boat => 
          boat.destination.toLowerCase().includes(query.destination.toLowerCase())
        );
      }
      return allBoats;
    }
  }
  return { default: MockBoat };
});

// Mock de Stripe
const mockStripe = {
  checkout: {
    sessions: {
      create: jest.fn()
    }
  },
  webhooks: {
    constructEvent: jest.fn()
  }
};

await jest.unstable_mockModule('stripe', () => ({
  default: jest.fn(() => mockStripe)
}));

// Mock du middleware d'authentification
await jest.unstable_mockModule('../middleware/auth.js', () => ({
  protect: (req, res, next) => {
    req.user = { _id: 'user1', email: 'client@example.com', role: 'client' };
    next();
  }
}));

const paymentRoutes = (await import('../routes/payment.js')).default;

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  app = express();
  app.use(express.json());
  app.use('/api/payment', paymentRoutes);
  
  // Données de test
  boatsStore.set('boat1', {
    _id: 'boat1',
    nom: 'Voilier Élégance',
    prix_jour: 150,
    image: 'test.jpg' // Ajout de l'image manquante
  });
  
  bookingsStore.set('booking1', {
    _id: 'booking1',
    boatId: 'boat1',
    userId: 'user1',
    startDate: '2024-06-01',
    endDate: '2024-06-03',
    numberOfGuests: 4,
    totalPrice: 300,
    status: 'confirmed'
  });
});

afterEach(() => {
  // Reset des données après chaque test
  paymentsStore.clear();
  jest.clearAllMocks();
});

describe('UNIT - Paiement', () => {
  it('crée une session de checkout Stripe -> 200 + URL', async () => {
    const checkoutData = {
      boatId: 'boat1',
      startDate: '2024-06-01',
      endDate: '2024-06-03',
      numberOfGuests: 4,
      specialRequests: 'Pas de demande spéciale'
    };

    // Mock de la réponse Stripe
    mockStripe.checkout.sessions.create.mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/test'
    });

    const res = await request(app)
      .post('/api/payment/create-checkout-session')
      .send(checkoutData);
  
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('url');
    expect(res.body.url).toBe('https://checkout.stripe.com/test');
    expect(res.body).toHaveProperty('bookingId');
  
    // Vérifier que Stripe a été appelé avec les bonnes données
    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Réservation Voilier Élégance', // Nom exact retourné par la route
            images: ['test.jpg']
          },
          unit_amount: 30000 // 300€ en centimes
        },
        quantity: 1
      }],
      metadata: {
        bookingId: 'booking1', // ID exact retourné par la route
        boatId: 'boat1',
        userId: 'user1', 
        startDate: '2024-06-01',
        endDate: '2024-06-03'
      },
      customer_email: 'client@example.com',
      success_url: 'http://localhost:5173/payment/success?session_id={CHECKOUT_SESSION_ID}', 
      cancel_url: 'http://localhost:5173/payment/cancel?bookingId=booking1' 
    });
  });
});