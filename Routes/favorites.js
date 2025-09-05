import express from 'express';
import Favorite from '../models/Favorite.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Ajouter un bateau aux favoris
// @route   POST /api/favorites
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { boatId } = req.body;
    const userId = req.user._id;

    if (!boatId) {
      return res.status(400).json({ message: 'ID du bateau requis' });
    }

    // Vérifier si le favori existe déjà
    const existingFavorite = await Favorite.findOne({ userId, boatId });
    if (existingFavorite) {
      return res.status(400).json({ message: 'Ce bateau est déjà dans vos favoris' });
    }

    const favorite = new Favorite({
      userId,
      boatId
    });

    await favorite.save();

    res.status(201).json({
      success: true,
      message: 'Bateau ajouté aux favoris',
      data: favorite
    });
  } catch (error) {
    console.error('Erreur ajout favori:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @desc    Supprimer un bateau des favoris
// @route   DELETE /api/favorites/:boatId
// @access  Private
router.delete('/:boatId', protect, async (req, res) => {
  try {
    const { boatId } = req.params;
    const userId = req.user._id;

    const favorite = await Favorite.findOneAndDelete({ userId, boatId });

    if (!favorite) {
      return res.status(404).json({ message: 'Favori non trouvé' });
    }

    res.json({
      success: true,
      message: 'Bateau retiré des favoris',
      data: favorite
    });
  } catch (error) {
    console.error('Erreur suppression favori:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @desc    Obtenir tous les favoris d'un utilisateur
// @route   GET /api/favorites
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    const favorites = await Favorite.find({ userId })
      .populate('boatId', 'nom type longueur capacite prix_jour image destination description')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: favorites.length,
      data: favorites
    });
  } catch (error) {
    console.error('Erreur récupération favoris:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @desc    Vérifier si un bateau est dans les favoris
// @route   GET /api/favorites/check/:boatId
// @access  Private
router.get('/check/:boatId', protect, async (req, res) => {
  try {
    const { boatId } = req.params;
    const userId = req.user._id;

    const favorite = await Favorite.findOne({ userId, boatId });

    res.json({
      success: true,
      isFavorite: !!favorite,
      data: favorite
    });
  } catch (error) {
    console.error('Erreur vérification favori:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;
