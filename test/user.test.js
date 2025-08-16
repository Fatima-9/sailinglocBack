// backend/test/user.test.js
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany();
});

describe('User model', () => {
  it('devrait créer un utilisateur valide', () => {
    const user = new User({
      nom: 'Dupont',
      prenom: 'Jean',
      email: 'jean.dupont@example.com',
      password: 'Password123!',
      tel: '0601020304',
      role: 'proprietaire'
    });
    expect(user.nom).toBe('Dupont');
    expect(user.email).toBe('jean.dupont@example.com');
    expect(user.role).toBe('proprietaire');
  });

  it('doit hasher le mot de passe avant sauvegarde', async () => {
    const user = new User({
      nom: 'Martin',
      prenom: 'Alice',
      email: 'alice.martin@example.com',
      password: 'Password123!',
      tel: '0601020305',
      role: 'locataire'
    });
    await user.save();
    expect(user.password).not.toBe('Password123!');
    expect(user.password.length).toBeGreaterThan(20); // hash bcrypt
  });

  it('doit comparer correctement le mot de passe', async () => {
    const user = new User({
      nom: 'Test',
      prenom: 'Test',
      email: 'example@example.com',
      password: 'Password123!',
      tel: '0601020306',
      role: 'locataire'
    });
    await user.save();
    const isMatch = await user.comparePassword('Password123!');
    expect(isMatch).toBe(true);
    const isMatchWrong = await user.comparePassword('WrongPassword');
    expect(isMatchWrong).toBe(false);
  });
}); 