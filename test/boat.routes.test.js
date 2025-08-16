import request from 'supertest';
import app from '../index.js';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Boat from '../models/Boat.js';

let tokenProprietaire;
let boatId;

beforeAll(async () => {
  // Nettoyer la base
  await User.deleteMany();
  await Boat.deleteMany();
  // Créer un utilisateur propriétaire
  const user = new User({
    nom: 'Proprio',
    prenom: 'Test',
    email: 'proprio@example.com',
    password: 'Password123!',
    tel: '0600000000',
    role: 'proprietaire'
  });
  await user.save();
  // Login pour obtenir le token
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'proprio@example.com', password: 'Password123!' });
  console.log('USER LOGIN:', res.body.user);
  tokenProprietaire = res.body.token;
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('API Bateaux', () => {
  it('GET /api/boats doit retourner 200 et un tableau', async () => {
    const res = await request(app).get('/api/boats');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/boats refuse sans token', async () => {
    const res = await request(app)
      .post('/api/boats')
      .send({});
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/boats crée un bateau avec un token propriétaire', async () => {
    const res = await request(app)
      .post('/api/boats')
      .set('Authorization', `Bearer ${tokenProprietaire}`)
      .send({
        nom: 'TestBoat',
        type: 'voilier',
        longueur: 10,
        prix_jour: 100,
        capacite: 4,
        image: '/images/boat.jpg',
        localisation: '43.51246,5.124885'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.nom).toBe('TestBoat');
    boatId = res.body.id;
  });

  it('PUT /api/boats/:id modifie un bateau', async () => {
    const res = await request(app)
      .put(`/api/boats/${boatId}`)
      .set('Authorization', `Bearer ${tokenProprietaire}`)
      .send({ prix_jour: 200 });
    expect(res.statusCode).toBe(200);
    expect(res.body.prix_jour).toBe(200);
  });

  it('DELETE /api/boats/:id supprime un bateau', async () => {
    const res = await request(app)
      .delete(`/api/boats/${boatId}`)
      .set('Authorization', `Bearer ${tokenProprietaire}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/supprimé/i);
  });
}); 