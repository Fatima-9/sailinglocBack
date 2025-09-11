import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

let app;

// Mocks UNITAIRES
const usersStore = new Map();

await jest.unstable_mockModule('../middleware/captcha.js', () => ({
  validateCaptcha: (req, res, next) => next()
}));

await jest.unstable_mockModule('../models/User.js', () => {
  class MockUser {
    constructor(doc) { Object.assign(this, doc); this._id = this._id || 'id_user'; }
    static async findOne(query) {
      if (query && query.email) {
        return usersStore.get(String(query.email).toLowerCase()) || null;
      }
      return null;
    }
    async comparePassword(candidate) {
      return candidate === this.password;
    }
  }
  return { default: MockUser };
});

await jest.unstable_mockModule('jsonwebtoken', () => ({
  default: { sign: () => 'mock-token' }
}));

const authRoutes = (await import('../routes/auth.js')).default;

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  // Seed: utilisateur
  usersStore.set('client@example.com', { _id: 'id1', email: 'client@example.com', password: 'Password123!', role: 'client', comparePassword: async (p) => p === 'Password123!' });
});

afterEach(() => {
  // reset password if tests changed it
  usersStore.set('client@example.com', { _id: 'id1', email: 'client@example.com', password: 'Password123!', role: 'client', comparePassword: async (p) => p === 'Password123!' });
});

describe('UNIT - Connexion', () => {
  it('login succès -> 200 + token', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'client@example.com', password: 'Password123!' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token', 'mock-token');
    expect(res.body.user.email).toBe('client@example.com');
  });

  it('login email inconnu -> 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'unknown@example.com', password: 'Password123!' });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  it('login mauvais mot de passe -> 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'client@example.com', password: 'Wrong!' });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });
});


