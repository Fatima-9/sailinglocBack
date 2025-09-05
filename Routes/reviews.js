import express from 'express';
import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @desc    Créer un nouvel avis
// @route   POST /api/reviews
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { boatId, bookingId, rating, comment } = req.body;
    const userId = req.user.id;

    console.log('📝 Création avis - Données reçues:', { boatId, bookingId, rating, comment });

    // Validation des champs requis
    if (!boatId || !rating || !comment) {
      return res.status(400).json({ 
        message: 'Les champs boatId, rating et comment sont obligatoires' 
      });
    }

    // Validation du rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        message: 'Le rating doit être entre 1 et 5' 
      });
    }



    // Vérifier si l'utilisateur a déjà laissé un avis pour ce bateau
    const existingReview = await Review.findOne({ 
      userId, 
      boatId
    });

    if (existingReview) {
      return res.status(400).json({ 
        message: 'Vous avez déjà laissé un avis pour ce bateau' 
      });
    }

    // Vérifier que la réservation existe et appartient à l'utilisateur
    if (bookingId) {
      const booking = await Booking.findById(bookingId);
      if (!booking || booking.userId.toString() !== userId) {
        return res.status(400).json({ 
          message: 'Réservation invalide' 
        });
      }
    }

    const review = new Review({
      userId,
      boatId,
      bookingId,
      rating,
      comment
    });

    console.log('💾 Sauvegarde de l\'avis:', review);

    await review.save();

    // Mettre à jour la note moyenne du bateau
    const averageRating = await Review.getAverageRating(boatId);

    console.log('✅ Avis créé avec succès, note moyenne mise à jour:', averageRating);

    res.status(201).json({
      success: true,
      data: review,
      averageRating
    });
  } catch (error) {
    console.error('❌ Erreur création avis:', error);
    
    // Gestion spécifique des erreurs de validation Mongoose
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Erreur de validation', 
        errors: validationErrors 
      });
    }
    
    res.status(500).json({ 
      message: 'Erreur serveur lors de la création de l\'avis',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne'
    });
  }
});

// @desc    Obtenir tous les avis d'un bateau
// @route   GET /api/reviews/boat/:boatId
// @access  Public
router.get('/boat/:boatId', async (req, res) => {
  try {
    const { page = 1, limit = 10, rating } = req.query;
    const { boatId } = req.params;

    let query = { boatId };
    if (rating) {
      query.rating = parseInt(rating);
    }

    const skip = (page - 1) * limit;

    const reviews = await Review.find(query)
      .populate('userId', 'nom prenom')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments(query);
    const averageRating = await Review.getAverageRating(boatId);

    res.json({
      success: true,
      count: reviews.length,
      total,
      averageRating,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit)
      },
      data: reviews
    });
  } catch (error) {
    console.error('Erreur récupération avis:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @desc    Obtenir tous les avis d'un utilisateur
// @route   GET /api/reviews/my-reviews
// @access  Private
router.get('/my-reviews', protect, async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.user.id })
      .populate('boatId', 'name images')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    console.error('Erreur récupération avis utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @desc    Obtenir les avis 5 étoiles pour la page d'accueil
// @route   GET /api/reviews/five-stars
// @access  Public
router.get('/five-stars', async (req, res) => {
  try {
    const { limit = 3 } = req.query;
    
    const reviews = await Review.find({ rating: 5 })
      .populate('userId', 'nom prenom')
      .populate('boatId', 'nom image destination type')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    console.error('Erreur récupération avis 5 étoiles:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @desc    Obtenir un avis spécifique
// @route   GET /api/reviews/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('userId', 'nom prenom')
      .populate('boatId', 'name images');

    if (!review) {
      return res.status(404).json({ message: 'Avis non trouvé' });
    }

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error('Erreur récupération avis:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @desc    Marquer un avis comme utile
// @route   PUT /api/reviews/:id/helpful
// @access  Public
router.put('/:id/helpful', async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Avis non trouvé' });
    }

    await review.incrementHelpful();

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error('Erreur marquage utile:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @desc    Mettre à jour un avis
// @route   PUT /api/reviews/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Avis non trouvé' });
    }

    // Vérifier que l'utilisateur peut modifier cet avis
    if (review.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    review.rating = rating || review.rating;
    review.comment = comment || review.comment;

    await review.save();

    // Mettre à jour la note moyenne du bateau
    const averageRating = await Review.getAverageRating(review.boatId);

    res.json({
      success: true,
      data: review,
      averageRating
    });
  } catch (error) {
    console.error('Erreur mise à jour avis:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @desc    Supprimer un avis
// @route   DELETE /api/reviews/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Avis non trouvé' });
    }

    // Vérifier que l'utilisateur peut supprimer cet avis
    if (review.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    await review.deleteOne();

    // Mettre à jour la note moyenne du bateau
    const averageRating = await Review.getAverageRating(review.boatId);

    res.json({
      success: true,
      message: 'Avis supprimé avec succès',
      averageRating
    });
  } catch (error) {
    console.error('Erreur suppression avis:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @desc    Obtenir les avis récents pour la page d'accueil
// @route   GET /api/reviews/recent
// @access  Public
router.get('/recent', async (req, res) => {
  try {
    const { limit = 6, rating } = req.query;
    
    let query = {};
    if (rating) {
      query.rating = parseInt(rating);
    }
    
    const reviews = await Review.find(query)
      .populate('userId', 'nom prenom')
      .populate('boatId', 'nom image localisation type')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    console.error('Erreur récupération avis récents:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @desc    Obtenir les meilleurs avis (4+ étoiles) pour la page d'accueil
// @route   GET /api/reviews/top
// @access  Public
router.get('/top', async (req, res) => {
  try {
    const { limit = 3 } = req.query;
    
    const reviews = await Review.find({ rating: { $gte: 4 } })
      .populate('userId', 'nom prenom')
      .populate('boatId', 'nom image destination type')
      .sort({ createdAt: -1 }) // Tri par date de création décroissante (plus récent en premier)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    console.error('Erreur récupération meilleurs avis:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});



// @desc    Obtenir tous les avis (Admin)
// @route   GET /api/reviews
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, rating, boatId, userId, search } = req.query;
    
    let query = {};
    
    // Filtre par note
    if (rating && rating !== 'all') {
      query.rating = parseInt(rating);
    }
    
    // Filtre par bateau
    if (boatId && boatId !== 'all') {
      query.boatId = boatId;
    }
    
    // Filtre par utilisateur
    if (userId && userId !== 'all') {
      query.userId = userId;
    }
    
    // Recherche textuelle dans les commentaires
    if (search && search.trim() !== '') {
      query.comment = { $regex: search, $options: 'i' };
    }

    const skip = (page - 1) * limit;
    
    const reviews = await Review.find(query)
      .populate('userId', 'nom prenom email')
      .populate('boatId', 'nom image destination')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments(query);

    res.json({
      success: true,
      count: reviews.length,
      total,
      reviews: reviews, // Changé de 'data' à 'reviews' pour correspondre au frontend
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalReviews: total,
        reviewsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Erreur récupération avis admin:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;
