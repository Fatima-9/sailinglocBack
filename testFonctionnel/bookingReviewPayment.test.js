import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { jest } from '@jest/globals';
import User from '../models/User.js';
import Boat from '../models/Boat.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import Payment from '../models/Payment.js';

let mongoServer;
let app;

async function registerAndLogin(email, role = 'client') {
  const payload = {
    nom: 'Test',
    prenom: 'User',
    email,
    password: 'Password123!',
    tel: '0601020304',
    role,
    isProfessionnel: role === 'proprietaire' ? false : undefined
  };
  await request(app).post('/api/auth/register').send(payload);
  const login = await request(app).post('/api/auth/login').send({ email, password: 'Password123!' });
  return login.body.token;
}

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'your-secret-key';
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;

  // Mock Stripe ESM module before importing the app
  await jest.unstable_mockModule('stripe', () => ({
    default: class Stripe {
      constructor() {}
      checkout = {
        sessions: {
          create: async () => ({ url: 'http://stripe.test/checkout', id: 'cs_test_123' }),
          retrieve: async () => ({ payment_status: 'paid', metadata: { bookingId: global.__TEST_BOOKING_ID__ || '' } })
        }
      }
    }
  }));

  const mod = await import('../index.js');
  app = mod.default;
});

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Boat.deleteMany({}),
    Booking.deleteMany({}),
    Review.deleteMany({}),
    Payment.deleteMany({})
  ]);
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Réservation - POST /api/bookings', () => {
  it('crée une réservation complétée et payée avec calcul du prix (201)', async () => {
    const token = await registerAndLogin('booker@example.com');
    const boat = await Boat.create({ nom: 'Sea Star', type: 'voilier', longueur: 10, prix_jour: 150, capacite: 4, image: '/img.png', destination: 'saint-malo', proprietaire: new mongoose.Types.ObjectId() });

    const startDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ boatId: String(boat._id), startDate, endDate, numberOfGuests: 2, specialRequests: 'Hublot' });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.paymentStatus).toBe('paid');

    const days = 3; // 5 - 2 = 3 jours
    expect(res.body.data.totalPrice).toBe(days * 150);
  });
});

describe('Avis - POST /api/reviews', () => {
  it('permet de créer un avis après une réservation complétée (201)', async () => {
    const token = await registerAndLogin('reviewer@example.com');
    const boat = await Boat.create({ nom: 'Blue Wave', type: 'voilier', longueur: 9, prix_jour: 120, capacite: 4, image: '/img.png', destination: 'saint-malo', proprietaire: new mongoose.Types.ObjectId() });

    const startDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ boatId: String(boat._id), startDate, endDate, numberOfGuests: 2 });

    const reviewRes = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send({ boatId: String(boat._id), bookingId: bookingRes.body.data._id, rating: 5, comment: 'Excellent bateau et super expérience !' });

    expect(reviewRes.statusCode).toBe(201);
    expect(reviewRes.body.success).toBe(true);
    expect(reviewRes.body.data.rating).toBe(5);
  });
});

describe('Paiement - /api/payment', () => {
  it('crée une session Checkout et une réservation en attente (200)', async () => {
    const token = await registerAndLogin('payer@example.com');
    const boat = await Boat.create({ nom: 'Pay Boat', type: 'yacht', longueur: 20, prix_jour: 500, capacite: 8, image: '/img.png', destination: 'saint-malo', proprietaire: new mongoose.Types.ObjectId() });
    const startDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .post('/api/payment/create-checkout-session')
      .set('Authorization', `Bearer ${token}`)
      .send({ boatId: String(boat._id), startDate, endDate, numberOfGuests: 4 });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('url');
    expect(res.body).toHaveProperty('bookingId');

    const booking = await Booking.findById(res.body.bookingId);
    expect(booking).not.toBeNull();
    expect(booking.status).toBe('pending');
    expect(booking.paymentStatus).toBe('pending');

    const payment = await Payment.findOne({ bookingId: res.body.bookingId });
    expect(payment).not.toBeNull();
  });

  it('confirme le paiement et met à jour la réservation (200)', async () => {
    const token = await registerAndLogin('confirm@example.com');
    const boat = await Boat.create({ nom: 'Confirm Boat', type: 'catamaran', longueur: 15, prix_jour: 300, capacite: 6, image: '/img.png', destination: 'saint-malo', proprietaire: new mongoose.Types.ObjectId() });
    const startDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

    const sessionRes = await request(app)
      .post('/api/payment/create-checkout-session')
      .set('Authorization', `Bearer ${token}`)
      .send({ boatId: String(boat._id), startDate, endDate, numberOfGuests: 3 });

    // Récupérer l'ID de réservation pour que le mock Stripe le renvoie lors du confirm
    global.__TEST_BOOKING_ID__ = String(sessionRes.body.bookingId);

    const confirmRes = await request(app)
      .post('/api/payment/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ session_id: 'cs_test_123' });

    expect(confirmRes.statusCode).toBe(200);
    expect(confirmRes.body.success).toBe(true);
    expect(confirmRes.body.data.status).toBe('confirmed');
    expect(confirmRes.body.data.paymentStatus).toBe('paid');
  });
});


