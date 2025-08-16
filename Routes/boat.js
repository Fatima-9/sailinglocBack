import express from 'express';
import Boat from '../models/Boat.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Middleware pour vérifier le Content-Type application/json
function requireJsonContent(req, res, next) {
  if (!req.is('application/json')) {
    return res.status(415).json({ message: 'Content-Type doit être application/json.' });
  }
  next();
}

// GET /api/boats - Récupérer tous les bateaux
router.get('/', async (req, res) => {
  try {
    const boats = await Boat.find();
    res.json(boats);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error });
  }
});

// GET /api/boats/my-boats - Récupérer les bateaux du propriétaire connecté
router.get('/my-boats', protect, authorize('proprietaire', 'admin'), async (req, res) => {
  try {
    const boats = await Boat.find({ proprietaire: req.user.id })
      .populate('proprietaire', 'nom prenom email')
      .sort({ createdAt: -1 });

    res.json(boats);
  } catch (error) {
    console.error('Erreur lors de la récupération des bateaux:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la récupération des bateaux',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// GET /api/boats/:id - Récupérer un bateau spécifique
router.get('/:id', async (req, res) => {
  try {
    const boat = await Boat.findById(req.params.id)
      .populate('proprietaire', 'nom prenom email');

    if (!boat) {
      return res.status(404).json({ 
        message: 'Bateau non trouvé' 
      });
    }

    res.json(boat);
  } catch (error) {
    console.error('Erreur lors de la récupération du bateau:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ 
        message: 'ID de bateau invalide' 
      });
    }

    res.status(500).json({ 
      message: 'Erreur serveur lors de la récupération du bateau',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// POST /api/boats - Ajouter un nouveau bateau (propriétaire ou admin uniquement)
router.post('/', requireJsonContent, protect, authorize('proprietaire', 'admin'), async (req, res) => {
  try {
    const { nom, type, longueur, prix_jour, capacite, image, destination, description, equipements } = req.body;
    const proprietaire = req.user.id; // ID de l'utilisateur connecté

    // Validation des champs requis
    if (!nom || !type || !longueur || !prix_jour || !capacite || !image || !destination) {
      return res.status(400).json({ 
        message: 'Les champs nom, type, longueur, prix_jour, capacite, image et destination sont obligatoires.' 
      });
    }

    // Validation des types
    if (typeof nom !== 'string' || typeof type !== 'string' || typeof image !== 'string' || typeof destination !== 'string') {
      return res.status(400).json({ 
        message: 'Les champs nom, type, image et destination doivent être des chaînes de caractères.' 
      });
    }

    if (typeof longueur !== 'number' || typeof prix_jour !== 'number' || typeof capacite !== 'number') {
      return res.status(400).json({ 
        message: 'Les champs longueur, prix_jour et capacite doivent être des nombres.' 
      });
    }

    // Validation des valeurs
    if (nom.trim().length < 2 || nom.trim().length > 100) {
      return res.status(400).json({ 
        message: 'Le nom du bateau doit contenir entre 2 et 100 caractères.' 
      });
    }

    if (!['voilier', 'bateau à moteur', 'catamaran'].includes(type.toLowerCase())) {
      return res.status(400).json({ 
        message: 'Le type doit être l\'un des suivants : voilier, bateau à moteur, catamaran' 
      });
    }

    if (longueur < 2 || longueur > 100) {
      return res.status(400).json({ 
        message: 'La longueur doit être entre 2 et 100 mètres.' 
      });
    }

    if (prix_jour <= 0) {
      return res.status(400).json({ 
        message: 'Le prix par jour doit être supérieur à 0.' 
      });
    }

    if (capacite < 1 || capacite > 50) {
      return res.status(400).json({ 
        message: 'La capacité doit être entre 1 et 50 personnes.' 
      });
    }

    // Validation de l'image (URL Firebase Storage ou chemin local)
    if (!image.trim()) {
      return res.status(400).json({ 
        message: 'L\'image est obligatoire.' 
      });
    }

    // Validation du format de l'image - accepter URLs Firebase Storage et chemins locaux
    const isValidImageUrl = image.trim().startsWith('https://firebasestorage.googleapis.com') ||
                           image.trim().startsWith('https://storage.googleapis.com') ||
                           image.trim().startsWith('http://') ||
                           image.trim().startsWith('https://') ||
                           image.trim().startsWith('/') ||
                           image.trim().startsWith('C:/');

    if (!isValidImageUrl) {
      return res.status(400).json({ 
        message: 'L\'image doit être une URL Firebase Storage valide ou un chemin local.' 
      });
    }

    // Validation de la destination
    const destinationsValides = ['saint-malo', 'les-glenan', 'crozon', 'la-rochelle', 'marseille', 'cannes', 'ajaccio', 'barcelone', 'palma', 'athenes', 'venise', 'amsterdam', 'split'];
    if (!destinationsValides.includes(destination.trim().toLowerCase())) {
      return res.status(400).json({ 
        message: 'La destination doit être l\'une des suivantes : ' + destinationsValides.join(', ') + '.' 
      });
    }

    // Vérifier si un bateau avec ce nom existe déjà
    const existingBoat = await Boat.findOne({ nom: nom.trim() });
    if (existingBoat) {
      return res.status(400).json({ 
        message: 'Un bateau avec ce nom existe déjà.' 
      });
    }

    // Créer le nouveau bateau
    const newBoat = new Boat({
      nom: nom.trim(),
      type: type.toLowerCase(),
      longueur,
      prix_jour,
      capacite,
      image: image.trim(),
      destination: destination.trim().toLowerCase(),
      description: description ? description.trim() : '',
      equipements: equipements && Array.isArray(equipements) ? equipements : [],
      proprietaire
    });

    // Sauvegarder dans MongoDB
    const savedBoat = await newBoat.save();

    // Populate les informations du propriétaire
    await savedBoat.populate('proprietaire', 'nom prenom email');

    res.status(201).json({
      success: true,
      message: 'Bateau ajouté avec succès',
      data: savedBoat
    });

  } catch (error) {
    console.error('Erreur lors de l\'ajout du bateau:', error);
    
    // Gestion des erreurs MongoDB
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Un bateau avec ce nom existe déjà.' 
      });
    }

    res.status(500).json({ 
      message: 'Erreur serveur lors de l\'ajout du bateau',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// PUT /api/boats/:id - Modifier un bateau existant (propriétaire ou admin uniquement)
router.put('/:id', requireJsonContent, protect, authorize('proprietaire', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Récupérer le bateau existant
    const bateau = await Boat.findById(id);
    if (!bateau) {
      return res.status(404).json({ message: "Bateau non trouvé" });
    }

    // Vérification stricte des types pour les champs modifiés
    if (updateData.nom && typeof updateData.nom !== 'string') {
      return res.status(400).json({ message: 'Le champ nom doit être une chaîne de caractères.' });
    }
    if (updateData.type && typeof updateData.type !== 'string') {
      return res.status(400).json({ message: 'Le champ type doit être une chaîne de caractères.' });
    }
    if (updateData.longueur && (typeof updateData.longueur !== 'number' || isNaN(updateData.longueur))) {
      return res.status(400).json({ message: 'Le champ longueur doit être un nombre.' });
    }
    if (updateData.prix_jour && (typeof updateData.prix_jour !== 'number' || isNaN(updateData.prix_jour))) {
      return res.status(400).json({ message: 'Le champ prix_jour doit être un nombre.' });
    }
    if (updateData.capacite && (typeof updateData.capacite !== 'number' || isNaN(updateData.capacite) || !Number.isInteger(updateData.capacite))) {
      return res.status(400).json({ message: 'Le champ capacite doit être un entier.' });
    }
    if (updateData.image && typeof updateData.image !== 'string') {
      return res.status(400).json({ message: 'Le champ image doit être une chaîne de caractères.' });
    }
    if (updateData.destination && typeof updateData.destination !== 'string') {
      return res.status(400).json({ message: 'Le champ destination doit être une chaîne de caractères.' });
    }
    
    // Trim automatique des champs texte
    const nomTrim = typeof updateData.nom === 'string' ? updateData.nom.trim() : '';
    const typeTrim = typeof updateData.type === 'string' ? updateData.type.trim() : '';
    const imageTrim = typeof updateData.image === 'string' ? updateData.image.trim() : '';
    const destinationTrim = typeof updateData.destination === 'string' ? updateData.destination.trim() : '';

    // nom : longueur min/max, pas de caractères spéciaux, première lettre en majuscule
    if (updateData.nom) {
      const nomFormat = nomTrim.charAt(0).toUpperCase() + nomTrim.slice(1);
      if (nomFormat.length < 2 || nomFormat.length > 100) {
        return res.status(400).json({ message: "Le nom du bateau doit contenir entre 2 et 100 caractères." });
      }
      if (!/^[a-zA-Z0-9 \-']+$/.test(nomFormat)) {
        return res.status(400).json({ message: "Le nom du bateau contient des caractères non autorisés (lettres, chiffres, espaces, tirets, apostrophes uniquement)." });
      }
    }
    
    if (updateData.type) {
      const typeLower = typeTrim.toLowerCase();
      const typesAutorises = ['voilier', 'bateau à moteur', 'catamaran'];
      if (!typesAutorises.includes(typeLower)) {
        return res.status(400).json({ message: `Le type doit être l'un des suivants : ${typesAutorises.join(', ')}` });
      }
      updateData.type = typeLower;
    }
    
    // longueur : nombre > 0, min 2, max 100
    if (updateData.longueur !== undefined) {
      if (typeof updateData.longueur !== 'number' || updateData.longueur <= 0 || updateData.longueur < 2 || updateData.longueur > 100) {
        return res.status(400).json({ message: "La longueur du bateau doit être un nombre positif entre 2 et 100 mètres." });
      }
    }
    
    // prix_jour : nombre > 0
    if (updateData.prix_jour !== undefined) {
      if (typeof updateData.prix_jour !== 'number' || updateData.prix_jour <= 0) {
        return res.status(400).json({ message: "Le prix par jour doit être un nombre supérieur à 0." });
      }
    }
    
    // capacite : entier > 0
    if (updateData.capacite !== undefined) {
      if (!Number.isInteger(updateData.capacite) || updateData.capacite <= 0) {
        return res.status(400).json({ message: "La capacité doit être un entier positif supérieur à 0." });
      }
    }
    
    // Cohérence capacité/longueur (ex: capacité <= longueur*2)
    const longueurFinale = updateData.longueur !== undefined ? updateData.longueur : bateau.longueur;
    const capaciteFinale = updateData.capacite !== undefined ? updateData.capacite : bateau.capacite;
    if (capaciteFinale > longueurFinale * 2) {
      return res.status(400).json({ message: `La capacité (${capaciteFinale}) est trop élevée pour la longueur du bateau (${longueurFinale}m). Maximum autorisé : ${longueurFinale*2}` });
    }
    
    // image : URL Firebase Storage ou chemin absolu local
    if (updateData.image) {
      if (
        typeof imageTrim !== 'string' ||
        !(
          imageTrim.startsWith('https://firebasestorage.googleapis.com') ||
          imageTrim.startsWith('https://storage.googleapis.com') ||
          imageTrim.startsWith('http://') ||
          imageTrim.startsWith('https://') ||
          imageTrim.startsWith('/') ||
          imageTrim.startsWith('C:/') ||
          imageTrim.startsWith('file:///')
        )
      ) {
        return res.status(400).json({ message: "L'image doit être une URL Firebase Storage valide ou un chemin local valide." });
      }
    }
    
    // destination : validation des destinations autorisées
    if (updateData.destination) {
      const destinationsValides = ['saint-malo', 'les-glenan', 'crozon', 'la-rochelle', 'marseille', 'cannes', 'ajaccio', 'barcelone', 'palma', 'athenes', 'venise', 'amsterdam', 'split'];
      if (
        typeof destinationTrim !== 'string' ||
        !destinationsValides.includes(destinationTrim.toLowerCase())
      ) {
        return res.status(400).json({ message: "La destination doit être l'une des suivantes : " + destinationsValides.join(', ') + "." });
      }
      updateData.destination = destinationTrim.toLowerCase();
    }
    
    // Vérifier si un bateau avec ce nom ET cette destination existe déjà (si modifiés)
    if (updateData.nom && updateData.destination) {
      const nomFormat = nomTrim.charAt(0).toUpperCase() + nomTrim.slice(1);
      const existingBoat = await Boat.findOne({ nom: nomFormat, destination: destinationTrim.toLowerCase() });
      if (existingBoat && existingBoat._id.toString() !== id) {
        return res.status(409).json({ message: "Un bateau avec ce nom et cette destination existe déjà." });
      }
    }
    
    // --- FIN VALIDATIONS ---
    const bateauModifie = await Boat.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!bateauModifie) {
      return res.status(404).json({ message: "Bateau non trouvé" });
    }
    res.json(bateauModifie);
  } catch (error) {
    res.status(400).json({ message: "Erreur lors de la modification du bateau", error });
  }
});

// DELETE /api/boats/:id - Supprimer un bateau (propriétaire ou admin uniquement)
router.delete('/:id', protect, authorize('proprietaire', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const bateauSupprime = await Boat.findByIdAndDelete(id);
    if (!bateauSupprime) {
      return res.status(404).json({ message: "Bateau non trouvé" });
    }
    res.json({ message: "Bateau supprimé avec succès"});
  } catch (error) {
    res.status(400).json({ message: "Erreur lors de la suppression du bateau", error });
  }
});

export default router; 