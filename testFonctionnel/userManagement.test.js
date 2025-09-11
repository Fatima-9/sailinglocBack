import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import Boat from '../models/Boat.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';

let mongoServer;
let app;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'your-secret-key';
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;
  const mod = await import('../index.js');
  app = mod.default;
});

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Boat.deleteMany({}),
    Booking.deleteMany({}),
    Review.deleteMany({})
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

describe('Inscription - POST /api/auth/register', () => {
  it('1) inscrit un client (tous champs, role=client, isProfessionnel=false)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nom: 'Client',
        prenom: 'Claire',
        email: 'client@example.com',
        password: 'Password123!',
        tel: '0601020304',
        role: 'client',
        isProfessionnel: false
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe('client@example.com');
    expect(res.body.user.role).toBe('client');
    expect(res.body.user.isProfessionnel).toBe(false);
  });

  it('2) inscrit un propriétaire (tous champs, role=proprietaire, isProfessionnel=false)', async () => {
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
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('proprio@example.com');
    expect(res.body.user.role).toBe('proprietaire');
    expect(res.body.user.isProfessionnel).toBe(false);
  });


  it('refuse si isProfessionnel est manquant pour un propriétaire (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nom: 'Missing',
        prenom: 'Flag',
        email: 'missingflag@example.com',
        password: 'Password123!',
        tel: '0601020307',
        role: 'proprietaire'
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/isProfessionnel/i);
  });

  it('refuse un mot de passe faible (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nom: 'Weak',
        prenom: 'Pwd',
        email: 'weakpwd@example.com',
        password: 'weak',
        tel: '0601020308',
        role: 'client',
        isProfessionnel: false
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/mot de passe/i);
  });

  it('refuse un téléphone invalide (longueur) (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nom: 'Bad',
        prenom: 'Phone',
        email: 'badphone@example.com',
        password: 'Password123!',
        tel: '123',
        role: 'client',
        isProfessionnel: false
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/téléphone/i);
  });

  it('refuse un téléphone non string (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nom: 'Bad',
        prenom: 'Type',
        email: 'badtype@example.com',
        password: 'Password123!',
        tel: 601020309, // number au lieu de string
        role: 'client',
        isProfessionnel: false
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/téléphone/i);
  });

  it('refuse si des champs requis manquent (400)', async () => {
    // mot de passe & tel valides pour atteindre la vérification des champs requis
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        password: 'Password123!',
        tel: '0601020310',
        role: 'client',
        isProfessionnel: false
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/tous les champs sont requis/i);
  });

  it('accepte rôle omis (par défaut client) si isProfessionnel est fourni (201)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nom: 'NoRole',
        prenom: 'DefaultClient',
        email: 'norole@example.com',
        password: 'Password123!',
        tel: '0601020311',
        isProfessionnel: false
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.user.role).toBe('client');
    expect(res.body.user.isProfessionnel).toBe(false);
  });

  it('refuse un téléphone avec caractère non numérique (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nom: 'Bad',
        prenom: 'Digit',
        email: 'baddigit@example.com',
        password: 'Password123!',
        tel: '06010A0304',
        role: 'client',
        isProfessionnel: false
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/téléphone/i);
  });

  it('normalise un email en minuscules (succès 201)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nom: 'Case',
        prenom: 'Email',
        email: 'UPPERLOWER@EXAMPLE.COM',
        password: 'Password123!',
        tel: '0601020312',
        role: 'client',
        isProfessionnel: false
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.user.email).toBe('upperlower@example.com');
  });

  it('refuse un email déjà utilisé (400)', async () => {
    const payload = {
      nom: 'Dup',
      prenom: 'Email',
      email: 'duplicate@example.com',
      password: 'Password123!',
      tel: '0601020313',
      role: 'client',
      isProfessionnel: false
    };
    const first = await request(app).post('/api/auth/register').send(payload);
    expect(first.statusCode).toBe(201);
    const second = await request(app).post('/api/auth/register').send(payload);
    expect(second.statusCode).toBe(400);
    expect(second.body.message).toMatch(/existe déjà/i);
  });

  it('propriétaire professionnel: succès si SIRET 14 et SIREN 9 chiffres (201)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nom: 'Pro',
        prenom: 'Owner',
        email: 'pro.owner@example.com',
        password: 'Password123!',
        tel: '0601020314',
        role: 'proprietaire',
        isProfessionnel: true,
        siret: '12345678901234',
        siren: '123456789'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.user.role).toBe('proprietaire');
    expect(res.body.user.isProfessionnel).toBe(true);
    expect(res.body.user.siret).toBe('12345678901234');
    expect(res.body.user.siren).toBe('123456789');
  });

  it('propriétaire professionnel: refuse si SIRET manquant (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nom: 'Pro',
        prenom: 'MissingSiret',
        email: 'pro.missing.siret@example.com',
        password: 'Password123!',
        tel: '0601020315',
        role: 'proprietaire',
        isProfessionnel: true,
        siren: '123456789'
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/siret.*siren.*obligatoires/i);
  });

  it('propriétaire professionnel: refuse si SIREN manquant (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nom: 'Pro',
        prenom: 'MissingSiren',
        email: 'pro.missing.siren@example.com',
        password: 'Password123!',
        tel: '0601020316',
        role: 'proprietaire',
        isProfessionnel: true,
        siret: '12345678901234'
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/siret.*siren.*obligatoires/i);
  });

  it('propriétaire professionnel: refuse SIRET invalide (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nom: 'Pro',
        prenom: 'BadSiret',
        email: 'pro.bad.siret@example.com',
        password: 'Password123!',
        tel: '0601020317',
        role: 'proprietaire',
        isProfessionnel: true,
        siret: '123',
        siren: '123456789'
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/siret.*14 chiffres/i);
  });

  it('propriétaire professionnel: refuse SIREN invalide (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        nom: 'Pro',
        prenom: 'BadSiren',
        email: 'pro.bad.siren@example.com',
        password: 'Password123!',
        tel: '0601020318',
        role: 'proprietaire',
        isProfessionnel: true,
        siret: '12345678901234',
        siren: '123'
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/siren.*9 chiffres/i);
  });
});

describe('Connexion - POST /api/auth/login', () => {
  it('connecte un utilisateur avec identifiants valides (200)', async () => {
    const email = 'login.success@example.com';
    const password = 'Password123!';
    await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Login', prenom: 'Ok', email, password, tel: '0601020401', role: 'client', isProfessionnel: false });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(email);
  });

  it('refuse des identifiants invalides (400)', async () => {
    const email = 'login.fail@example.com';
    const password = 'Password123!';
    await request(app)
      .post('/api/auth/register')
      .send({ nom: 'Login', prenom: 'Fail', email, password, tel: '0601020402', role: 'client', isProfessionnel: false });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'WrongPass123!' });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  it("refuse un utilisateur inexistant (400)", async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'doesnotexist@example.com', password: 'Password123!' });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });
});

describe('Dashboard Admin - GET /api/auth/dashboard', () => {
  async function createAdminAndToken() {
    const admin = new User({ nom: 'Admin', prenom: 'User', email: 'admin@example.com', password: 'Password123!', tel: '0601020500', role: 'admin' });
    await admin.save();
    const loginRes = await request(app).post('/api/auth/login').send({ email: 'admin@example.com', password: 'Password123!' });
    return { token: loginRes.body.token, admin };
  }

  it('retourne les stats et derniers utilisateurs pour un admin (200)', async () => {
    const { token } = await createAdminAndToken();
    await request(app).post('/api/auth/register').send({ nom: 'U1', prenom: 'Ok', email: 'u1@example.com', password: 'Password123!', tel: '0601020501', role: 'client', isProfessionnel: false });
    await request(app).post('/api/auth/register').send({ nom: 'U2', prenom: 'Ok', email: 'u2@example.com', password: 'Password123!', tel: '0601020502', role: 'proprietaire', isProfessionnel: false });

    const res = await request(app)
      .get('/api/auth/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('stats');
    expect(res.body.stats).toHaveProperty('totalUsers');
    expect(res.body).toHaveProperty('recentUsers');
    expect(Array.isArray(res.body.recentUsers)).toBe(true);
  });

  it('refuse sans token (401)', async () => {
    const res = await request(app).get('/api/auth/dashboard');
    expect(res.statusCode).toBe(401);
  });

  it('refuse un non-admin (403)', async () => {
    await request(app).post('/api/auth/register').send({ nom: 'Client', prenom: 'Simple', email: 'client.simple@example.com', password: 'Password123!', tel: '0601020503', role: 'client', isProfessionnel: false });
    const login = await request(app).post('/api/auth/login').send({ email: 'client.simple@example.com', password: 'Password123!' });
    const res = await request(app).get('/api/auth/dashboard').set('Authorization', `Bearer ${login.body.token}`);
    expect(res.statusCode).toBe(403);
  });
});

describe('Admin - gestion des utilisateurs', () => {
  async function adminToken() {
    const admin = new User({ nom: 'Admin', prenom: 'Root', email: 'root@example.com', password: 'Password123!', tel: '0601020600', role: 'admin' });
    await admin.save();
    const loginRes = await request(app).post('/api/auth/login').send({ email: 'root@example.com', password: 'Password123!' });
    return { token: loginRes.body.token, admin };
  }

  it('supprime un utilisateur (200)', async () => {
    const { token } = await adminToken();
    const user = await User.create({ nom: 'To', prenom: 'Delete', email: 'delete.me@example.com', password: 'Password123!', tel: '0601020601', role: 'client' });
    const res = await request(app).delete(`/api/auth/users/${user._id}`).set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    const after = await User.findById(user._id);
    expect(after).toBeNull();
  });

  it('interdit de se supprimer soi-même (400)', async () => {
    const { token, admin } = await adminToken();
    const res = await request(app).delete(`/api/auth/users/${admin._id}`).set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
  });

  it('404 si utilisateur à supprimer inexistant', async () => {
    const { token } = await adminToken();
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/api/auth/users/${fakeId}`).set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });

  it('modifie un utilisateur (200)', async () => {
    const { token } = await adminToken();
    const user = await User.create({ nom: 'Old', prenom: 'Name', email: 'old.name@example.com', password: 'Password123!', tel: '0601020602', role: 'client' });
    const res = await request(app)
      .put(`/api/auth/users/${user._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nom: 'New', prenom: 'Name', email: 'new.name@example.com', tel: '0601020603', role: 'client', isProfessionnel: false });
    expect(res.statusCode).toBe(200);
    expect(res.body.user.nom).toBe('New');
    expect(res.body.user.email).toBe('new.name@example.com');
  });

  it('refuse un téléphone invalide lors de la modif (400)', async () => {
    const { token } = await adminToken();
    const user = await User.create({ nom: 'Tel', prenom: 'Bad', email: 'tel.bad@example.com', password: 'Password123!', role: 'client' });
    const res = await request(app)
      .put(`/api/auth/users/${user._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nom: 'Tel', prenom: 'Bad', email: 'tel.bad@example.com', tel: '123', role: 'client', isProfessionnel: false });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/téléphone/i);
  });

  it("refuse l'email déjà utilisé (400)", async () => {
    const { token } = await adminToken();
    const userA = await User.create({ nom: 'DupA', prenom: 'X', email: 'dupa@example.com', password: 'Password123!', tel: '0601020604', role: 'client' });
    const userB = await User.create({ nom: 'DupB', prenom: 'Y', email: 'dupb@example.com', password: 'Password123!', tel: '0601020605', role: 'client' });
    const res = await request(app)
      .put(`/api/auth/users/${userB._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nom: 'DupB', prenom: 'Y', email: 'dupa@example.com', tel: '0601020605', role: 'client', isProfessionnel: false });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/existe déjà/i);
  });

  it('proprietaire professionnel: exige SIRET/SIREN (400) puis accepte avec valeurs valides (200)', async () => {
    const { token } = await adminToken();
    const user = await User.create({ nom: 'Pro', prenom: 'Edit', email: 'pro.edit@example.com', password: 'Password123!', tel: '0601020606', role: 'proprietaire' });
    const bad = await request(app)
      .put(`/api/auth/users/${user._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nom: 'Pro', prenom: 'Edit', email: 'pro.edit@example.com', tel: '0601020606', role: 'proprietaire', isProfessionnel: true });
    expect(bad.statusCode).toBe(400);
    expect(bad.body.message).toMatch(/SIRET.*SIREN.*obligatoires/i);

    const good = await request(app)
      .put(`/api/auth/users/${user._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nom: 'Pro', prenom: 'Edit', email: 'pro.edit@example.com', tel: '0601020606', role: 'proprietaire', isProfessionnel: true, siret: '12345678901234', siren: '123456789' });
    expect(good.statusCode).toBe(200);
    expect(good.body.user.isProfessionnel).toBe(true);
    expect(good.body.user.siret).toBe('12345678901234');
    expect(good.body.user.siren).toBe('123456789');
  });
});

describe('Profil utilisateur - PUT /api/user/update', () => {
  it('met à jour les infos basiques (200)', async () => {
    const user = await User.create({ nom: 'Prof', prenom: 'Old', email: 'profile.old@example.com', password: 'Password123!', tel: '0601020700', role: 'client' });
    const res = await request(app)
      .put('/api/user/update')
      .send({ id: String(user._id), nom: 'Prof', prenom: 'New', email: 'profile.new@example.com', telephone: '0601020701' });
    expect(res.statusCode).toBe(200);
    expect(res.body.user.prenom).toBe('New');
    expect(res.body.user.tel).toBe('0601020701');
  });

  it('hash le mot de passe lorsqu’il est fourni (200)', async () => {
    const user = await User.create({ nom: 'Pwd', prenom: 'Change', email: 'pwd.change@example.com', password: 'Password123!', tel: '0601020702', role: 'client' });
    const res = await request(app)
      .put('/api/user/update')
      .send({ id: String(user._id), nom: 'Pwd', prenom: 'Change', email: 'pwd.change@example.com', telephone: '0601020702', password: 'NewPassword123!' });
    expect(res.statusCode).toBe(200);
    const updated = await User.findById(user._id);
    const isMatch = await updated.comparePassword('NewPassword123!');
    expect(isMatch).toBe(true);
  });

  it('404 si utilisateur introuvable', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put('/api/user/update')
      .send({ id: String(fakeId), nom: 'X', prenom: 'Y', email: 'xy@example.com', telephone: '0601020703' });
    expect(res.statusCode).toBe(404);
  });

  it('met à jour SIRET/SIREN pour un proprietaire pro (200)', async () => {
    const user = await User.create({
      nom: 'Pro',
      prenom: 'Owner',
      email: 'pro.owner.update@example.com',
      password: 'Password123!',
      tel: '0601020710',
      role: 'proprietaire',
      isProfessionnel: true,
      siret: '12345678901234',
      siren: '123456789'
    });
    const res = await request(app)
      .put('/api/user/update')
      .send({
        id: String(user._id),
        nom: 'Pro',
        prenom: 'Owner',
        email: 'pro.owner.update@example.com',
        telephone: '0601020711',
        siret: '99999999999999',
        siren: '987654321'
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.user.siret).toBe('99999999999999');
    expect(res.body.user.siren).toBe('987654321');
  });

  it('ne modifie pas le mot de passe si password est vide (200)', async () => {
    const user = await User.create({
      nom: 'NoPwd',
      prenom: 'Change',
      email: 'no.pwd.change@example.com',
      password: 'Password123!',
      tel: '0601020712',
      role: 'client'
    });
    const before = await User.findById(user._id);
    const beforeHash = before.password;
    const res = await request(app)
      .put('/api/user/update')
      .send({ id: String(user._id), nom: 'NoPwd', prenom: 'Change', email: 'no.pwd.change@example.com', telephone: '0601020713', password: '' });
    expect(res.statusCode).toBe(200);
    const after = await User.findById(user._id);
    expect(after.password).toBe(beforeHash);
  });

  it('ne modifie pas SIRET/SIREN si champs vides pour un proprietaire pro (200)', async () => {
    const user = await User.create({
      nom: 'Pro',
      prenom: 'KeepIds',
      email: 'pro.keep.ids@example.com',
      password: 'Password123!',
      tel: '0601020714',
      role: 'proprietaire',
      isProfessionnel: true,
      siret: '11111111111111',
      siren: '222222222'
    });
    const res = await request(app)
      .put('/api/user/update')
      .send({
        id: String(user._id),
        nom: 'Pro',
        prenom: 'KeepIds',
        email: 'pro.keep.ids@example.com',
        telephone: '0601020715',
        siret: '',
        siren: ''
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.user.siret).toBe('11111111111111');
    expect(res.body.user.siren).toBe('222222222');
  });
});

describe('Suppression de compte - DELETE /api/user/delete-account', () => {
  async function createUserAndToken(email = 'delete.account@example.com') {
    await request(app).post('/api/auth/register').send({ nom: 'Del', prenom: 'Acc', email, password: 'Password123!', tel: '0601020800', role: 'client', isProfessionnel: false });
    const login = await request(app).post('/api/auth/login').send({ email, password: 'Password123!' });
    const user = await User.findOne({ email });
    return { token: login.body.token, user };
  }

  it('refuse sans token (401)', async () => {
    const res = await request(app).delete('/api/user/delete-account');
    expect(res.statusCode).toBe(401);
  });

  it('supprime le compte et les bateaux associés (200)', async () => {
    const { token, user } = await createUserAndToken('delete.with.boats@example.com');
    await Boat.create({ nom: 'Boat X', type: 'voilier', longueur: 10, prix_jour: 100, capacite: 4, image: '/img.png', destination: 'saint-malo', proprietaire: user._id });
    // Réservation où il est locataire
    const boatA = await Boat.create({ nom: 'Boat Y', type: 'voilier', longueur: 12, prix_jour: 120, capacite: 5, image: '/img.png', destination: 'saint-malo', proprietaire: new mongoose.Types.ObjectId() });
    await Booking.create({ userId: user._id, boatId: boatA._id, startDate: new Date(), endDate: new Date(Date.now()+86400000), totalPrice: 120, numberOfGuests: 2 });
    await Review.create({ userId: user._id, boatId: boatA._id, rating: 5, comment: 'Excellente bateau, merci!' });

    const res = await request(app).delete('/api/user/delete-account').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);

    const afterUser = await User.findById(user._id);
    expect(afterUser).toBeNull();
    const boats = await Boat.countDocuments({ proprietaire: user._id });
    expect(boats).toBe(0);
    const bookings = await Booking.countDocuments({ userId: user._id });
    expect(bookings).toBe(0);
    const reviews = await Review.countDocuments({ userId: user._id });
    expect(reviews).toBe(0);
  });

  it('404 si utilisateur du token introuvable', async () => {
    const { token, user } = await createUserAndToken('delete.404@example.com');
    await User.findByIdAndDelete(user._id);
    const res = await request(app).delete('/api/user/delete-account').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });
});