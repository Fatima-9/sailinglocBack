// backend/test/boat.test.js
import Boat from '../models/Boat.js';

describe('Boat model', () => {
  it('devrait créer un bateau valide', () => {
    const boat = new Boat({
      nom: 'TestBoat',
      type: 'voilier',
      longueur: 10,
      prix_jour: 100,
      capacite: 4,
      image: '/images/boat.jpg',
      localisation: '43.51246,5.124885'
    });
    expect(boat.nom).toBe('TestBoat');
    expect(boat.type).toBe('voilier');
    expect(boat.longueur).toBe(10);
  });
});
