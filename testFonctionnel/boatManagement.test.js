import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import Boat from '../models/Boat.js';

let mongoServer;
let app;
let tokenProprietaire;
let tokenClient;
let proprietaireId;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;
  const mod = await import('../index.js');
  app = mod.default;

  // Créer un propriétaire et un client, puis récupérer leurs tokens via login
  const proprietaire = new User({
    nom: 'Proprio', prenom: 'Test', email: 'proprio@example.com', password: 'Password123!', tel: '0600000000', role: 'proprietaire', isProfessionnel: false
  });
  await proprietaire.save();
  proprietaireId = String(proprietaire._id);
  const client = new User({
    nom: 'Client', prenom: 'Test', email: 'client@example.com', password: 'Password123!', tel: '0600000001', role: 'client', isProfessionnel: false
  });
  await client.save();

  const resLoginProprio = await request(app).post('/api/auth/login').send({ email: 'proprio@example.com', password: 'Password123!' });
  tokenProprietaire = resLoginProprio.body.token;
  const resLoginClient = await request(app).post('/api/auth/login').send({ email: 'client@example.com', password: 'Password123!' });
  tokenClient = resLoginClient.body.token;
});

afterEach(async () => {
  await Boat.deleteMany({});
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

const validBoatPayload = () => ({
  nom: 'TestBoat',
  type: 'voilier',
  longueur: 10,
  prix_jour: 100,
  capacite: 4,
  image: '/images/boat.jpg',
  destination: 'marseille',
  description: 'Beau bateau',
  equipements: ['GPS', 'Radio']
});

describe('Gestion des bateaux', () => {
  it('GET /api/boats retourne 200 et un tableau', async () => {
    const res = await request(app).get('/api/boats');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/boats sans token -> 401', async () => {
    const res = await request(app).post('/api/boats').send({});
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/boats avec token client -> 403', async () => {
    const res = await request(app)
      .post('/api/boats')
      .set('Authorization', `Bearer ${tokenClient}`)
      .send(validBoatPayload());
    expect(res.statusCode).toBe(403);
  });

  it('POST /api/boats refuse Content-Type incorrect -> 415', async () => {
    const res = await request(app)
      .post('/api/boats')
      .set('Authorization', `Bearer ${tokenProprietaire}`)
      .set('Content-Type', 'text/plain')
      .send('not-json');
    expect(res.statusCode).toBe(415);
  });

  it('POST /api/boats crée un bateau valide -> 201', async () => {
    const res = await request(app)
      .post('/api/boats')
      .set('Authorization', `Bearer ${tokenProprietaire}`)
      .send(validBoatPayload());
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nom).toBe('TestBoat');
    expect(String(res.body.data.proprietaire._id)).toBe(proprietaireId);
  });

  it('POST /api/boats manque des champs requis -> 400', async () => {
    const payload = { ...validBoatPayload() };
    delete payload.nom;
    const res = await request(app)
      .post('/api/boats')
      .set('Authorization', `Bearer ${tokenProprietaire}`)
      .send(payload);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/obligatoires/i);
  });

  it('POST /api/boats types invalides -> 400', async () => {
    const payload = { ...validBoatPayload(), longueur: '10', prix_jour: 'abc', capacite: '4' };
    const res = await request(app)
      .post('/api/boats')
      .set('Authorization', `Bearer ${tokenProprietaire}`)
      .send(payload);
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/boats valeurs invalides -> 400 (longueur/prix/capacite/type/destination/image)', async () => {
    const base = validBoatPayload();
    // longueur trop petite
    let res = await request(app).post('/api/boats').set('Authorization', `Bearer ${tokenProprietaire}`).send({ ...base, longueur: 1 });
    expect(res.statusCode).toBe(400);
    // prix <= 0
    res = await request(app).post('/api/boats').set('Authorization', `Bearer ${tokenProprietaire}`).send({ ...base, prix_jour: 0 });
    expect(res.statusCode).toBe(400);
    // capacite < 1
    res = await request(app).post('/api/boats').set('Authorization', `Bearer ${tokenProprietaire}`).send({ ...base, capacite: 0 });
    expect(res.statusCode).toBe(400);
    // type non autorisé
    res = await request(app).post('/api/boats').set('Authorization', `Bearer ${tokenProprietaire}`).send({ ...base, type: 'canoe' });
    expect(res.statusCode).toBe(400);
    // destination non autorisée
    res = await request(app).post('/api/boats').set('Authorization', `Bearer ${tokenProprietaire}`).send({ ...base, destination: 'paris' });
    expect(res.statusCode).toBe(400);
    // image vide
    res = await request(app).post('/api/boats').set('Authorization', `Bearer ${tokenProprietaire}`).send({ ...base, image: '   ' });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/boats image format invalide -> 400', async () => {
    const payload = { ...validBoatPayload(), image: 'relative\npath' };
    const res = await request(app)
      .post('/api/boats')
      .set('Authorization', `Bearer ${tokenProprietaire}`)
      .send(payload);
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/boats nom dupliqué -> 400', async () => {
    const payload = validBoatPayload();
    let res = await request(app).post('/api/boats').set('Authorization', `Bearer ${tokenProprietaire}`).send(payload);
    expect(res.statusCode).toBe(201);
    res = await request(app).post('/api/boats').set('Authorization', `Bearer ${tokenProprietaire}`).send(payload);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/existe déjà/i);
  });

  it('GET /api/boats/:id retourne un bateau (200) et erreurs 400/404', async () => {
    const create = await request(app).post('/api/boats').set('Authorization', `Bearer ${tokenProprietaire}`).send(validBoatPayload());
    const id = create.body.data._id;
    // 200
    let res = await request(app).get(`/api/boats/${id}`);
    expect(res.statusCode).toBe(200);
    // 400 id invalide
    res = await request(app).get('/api/boats/123');
    expect(res.statusCode).toBe(400);
    // 404 not found
    const validButMissingId = new mongoose.Types.ObjectId().toString();
    res = await request(app).get(`/api/boats/${validButMissingId}`);
    expect(res.statusCode).toBe(404);
  });

  it('GET /api/boats/my-boats retourne les bateaux du propriétaire (200)', async () => {
    await request(app).post('/api/boats').set('Authorization', `Bearer ${tokenProprietaire}`).send({ ...validBoatPayload(), nom: 'BoatA' });
    await request(app).post('/api/boats').set('Authorization', `Bearer ${tokenProprietaire}`).send({ ...validBoatPayload(), nom: 'BoatB' });
    const res = await request(app)
      .get('/api/boats/my-boats')
      .set('Authorization', `Bearer ${tokenProprietaire}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    expect(res.body.every(b => String(b.proprietaire._id) === proprietaireId)).toBe(true);
  });

  it('PUT /api/boats/:id met à jour un bateau (200)', async () => {
    const create = await request(app).post('/api/boats').set('Authorization', `Bearer ${tokenProprietaire}`).send(validBoatPayload());
    const id = create.body.data._id;
    const res = await request(app)
      .put(`/api/boats/${id}`)
      .set('Authorization', `Bearer ${tokenProprietaire}`)
      .send({ prix_jour: 250 });
    expect(res.statusCode).toBe(200);
    expect(res.body.prix_jour).toBe(250);
  });

  it('PUT /api/boats/:id refuse types invalides (400)', async () => {
    const create = await request(app).post('/api/boats').set('Authorization', `Bearer ${tokenProprietaire}`).send(validBoatPayload());
    const id = create.body.data._id;
    const res = await request(app)
      .put(`/api/boats/${id}`)
      .set('Authorization', `Bearer ${tokenProprietaire}`)
      .send({ prix_jour: 'abc' });
    expect(res.statusCode).toBe(400);
  });

  it('PUT /api/boats/:id refuse capacité trop élevée par rapport à la longueur (400)', async () => {
    const create = await request(app).post('/api/boats').set('Authorization', `Bearer ${tokenProprietaire}`).send({ ...validBoatPayload(), longueur: 10, capacite: 4 });
    const id = create.body.data._id;
    const res = await request(app)
      .put(`/api/boats/${id}`)
      .set('Authorization', `Bearer ${tokenProprietaire}`)
      .send({ capacite: 25 }); // > longueur * 2 (20)
    expect(res.statusCode).toBe(400);
  });

  it('PUT /api/boats/:id avec token client -> 403', async () => {
    const create = await request(app).post('/api/boats').set('Authorization', `Bearer ${tokenProprietaire}`).send(validBoatPayload());
    const id = create.body.data._id;
    const res = await request(app)
      .put(`/api/boats/${id}`)
      .set('Authorization', `Bearer ${tokenClient}`)
      .send({ prix_jour: 300 });
    expect(res.statusCode).toBe(403);
  });

  it('DELETE /api/boats/:id supprime un bateau (200), not found (404), id invalide (400)', async () => {
    const create = await request(app).post('/api/boats').set('Authorization', `Bearer ${tokenProprietaire}`).send(validBoatPayload());
    const id = create.body.data._id;
    // 200 delete
    let res = await request(app)
      .delete(`/api/boats/${id}`)
      .set('Authorization', `Bearer ${tokenProprietaire}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/supprimé/i);
    // 404 not found
    res = await request(app)
      .delete(`/api/boats/${id}`)
      .set('Authorization', `Bearer ${tokenProprietaire}`);
    expect(res.statusCode).toBe(404);
    // 400 invalid id
    res = await request(app)
      .delete('/api/boats/abc')
      .set('Authorization', `Bearer ${tokenProprietaire}`);
    expect(res.statusCode).toBe(400);
  });
});


