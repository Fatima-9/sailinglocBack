import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

let app;

// Mocks isolés pour tests UNITAIRES
const usersStore = new Map();

await jest.unstable_mockModule('../middleware/captcha.js', () => ({
  validateCaptcha: (req, res, next) => next()
}));

await jest.unstable_mockModule('../models/User.js', () => {
  class MockUser {
    constructor(doc) {
      Object.assign(this, doc);
      this._id = this._id || `id_${Math.random().toString(36).slice(2)}`;
      this.comparePassword = async (candidate) => candidate === this.password;
    }
    static async findOne(query) {
      if (query && query.email) {
        return usersStore.get(String(query.email).toLowerCase()) || null;
      }
      return null;
    }
    async save() {
      // Simule la normalisation email en lowercase
      if (this.email) this.email = String(this.email).toLowerCase();
      if (usersStore.has(this.email)) {
        const err = new Error('duplicate');
        err.code = 11000;
        throw err;
      }
      usersStore.set(this.email, this);
      return this;
    }
  }
  return { default: MockUser };
});

const jwtMock = await jest.unstable_mockModule('jsonwebtoken', () => ({
  default: { sign: () => 'mock-token' }
}));

const authRoutes = (await import('../routes/auth.js')).default;

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
});

afterEach(() => {
  usersStore.clear();
});

describe('UNIT - Inscription', () => {
  it('crée un client (tous champs valides, isProfessionnel=false) -> 201', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nom: 'Dupont',
        prenom: 'Jean',
        email: 'CLIENT@Example.com',
        password: 'Password123!',
        tel: '0601020304',
        role: 'client',
        isProfessionnel: false
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.token).toBe('mock-token');
    expect(res.body.user.email).toBe('client@example.com');
    expect(res.body.user.role).toBe('client');
    expect(res.body.user.isProfessionnel).toBe(false);
  });

  it('crée un propriétaire non pro (isProfessionnel=false) -> 201', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nom: 'Proprio',
        prenom: 'Paul',
        email: 'proprio@example.com',
        password: 'Password123!',
        tel: '0601020305',
        role: 'proprietaire',
        isProfessionnel: false
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.user.role).toBe('proprietaire');
    expect(res.body.user.isProfessionnel).toBe(false);
  });

  it('refuse rôle invalide -> 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nom: 'Bad', prenom: 'Role', email: 'badrole@example.com', password: 'Password123!', tel: '0601020306', role: 'admin', isProfessionnel: false
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/rôle invalide/i);
  });

  it('refuse isProfessionnel manquant -> 201', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'A', prenom: 'B', email: 'c@example.com', password: 'Password123!', tel: '0601020307', role: 'client' });
    expect(res.statusCode).toBe(201);
    expect(res.body.user.isProfessionnel).toBe(false);
  });

  it('refuse téléphone invalide -> 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'A', prenom: 'B', email: 'c@example.com', password: 'Password123!', tel: '123', role: 'client', isProfessionnel: false });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/téléphone/i);
  });

  it('refuse mot de passe faible -> 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'A', prenom: 'B', email: 'c@example.com', password: 'weak', tel: '0601020308', role: 'client', isProfessionnel: false });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/mot de passe/i);
  });

  it('refuse email dupliqué -> 400', async () => {
    const payload = { nom: 'A', prenom: 'B', email: 'dup@example.com', password: 'Password123!', tel: '0601020309', role: 'client', isProfessionnel: false };
    const first = await request(app).post('/api/auth/register').send(payload);
    expect(first.statusCode).toBe(201);
    const second = await request(app).post('/api/auth/register').send(payload);
    expect(second.statusCode).toBe(400);
    expect(second.body.message).toMatch(/existe déjà/i);
  });

  it('propriétaire professionnel: succès si SIRET/SIREN valides -> 201', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nom: 'Pro', prenom: 'Owner', email: 'pro@example.com', password: 'Password123!', tel: '0601020310', role: 'proprietaire', isProfessionnel: true,
        siret: '12345678901234', siren: '123456789'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.user.isProfessionnel).toBe(true);
  });

  it('propriétaire professionnel: SIRET manquant -> 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Pro', prenom: 'Owner', email: 'pro2@example.com', password: 'Password123!', tel: '0601020311', role: 'proprietaire', isProfessionnel: true, siren: '123456789' });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/siret.*siren.*obligatoires/i);
  });
});


