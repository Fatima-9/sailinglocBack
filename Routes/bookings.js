import express from 'express';
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @desc    Créer une nouvelle réservation
// @route   POST /api/bookings
// @access  Private (utilisateurs connectés)
router.post('/', protect, async (req, res) => {
  try {
    const { boatId, startDate, endDate, numberOfGuests, specialRequests } = req.body;
    const userId = req.user.id;

    // Validation des dates
    if (new Date(startDate) <= new Date()) {
      return res.status(400).json({ message: 'La date de début doit être dans le futur' });
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ message: 'La date de fin doit être après la date de début' });
    }

    // Vérifier si le bateau est disponible pour ces dates
    const conflictingBooking = await Booking.findOne({
      boatId,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        {
          startDate: { $lte: new Date(endDate) },
          endDate: { $gte: new Date(startDate) }
        }
      ]
    });

    if (conflictingBooking) {
      return res.status(400).json({ message: 'Le bateau n\'est pas disponible pour ces dates' });
    }

    // Calculer le prix total en récupérant le prix du bateau
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    // Récupérer le prix du bateau depuis la base de données
    const boat = await mongoose.model('Boat').findById(boatId);
    if (!boat) {
      return res.status(404).json({ message: 'Bateau non trouvé' });
    }
    
    const totalPrice = days * boat.prix_jour; // Prix par jour du bateau

    const booking = new Booking({
      userId,
      boatId,
      startDate,
      endDate,
      numberOfGuests,
      specialRequests,
      totalPrice,
      status: 'completed', // Statut automatiquement completed pour permettre les avis
      paymentStatus: 'paid' // Statut de paiement automatiquement paid
    });

    await booking.save();

    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Erreur création réservation:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @desc    Obtenir toutes les réservations d'un utilisateur
// @route   GET /api/bookings/my-bookings
// @access  Private
router.get('/my-bookings', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id })
      .populate('boatId', 'name images price')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.error('Erreur récupération réservations:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @desc    Obtenir une réservation spécifique
// @route   GET /api/bookings/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'nom prenom email')
      .populate('boatId', 'name images price description');

    if (!booking) {
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }

    // Vérifier que l'utilisateur peut voir cette réservation
    if (booking.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Erreur récupération réservation:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @desc    Annuler une réservation
// @route   PUT /api/bookings/:id/cancel
// @access  Private
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }

    if (booking.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'La réservation est déjà annulée' });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({ message: 'Impossible d\'annuler une réservation terminée' });
    }

    booking.status = 'cancelled';
    await booking.save();

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Erreur annulation réservation:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @desc    Obtenir toutes les réservations (Admin)
// @route   GET /api/bookings
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let query = {};
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    
    const bookings = await Booking.find(query)
      .populate('userId', 'nom prenom email')
      .populate('boatId', 'name images price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(query);

    res.json({
      success: true,
      count: bookings.length,
      total,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit)
      },
      data: bookings
    });
  } catch (error) {
    console.error('Erreur récupération réservations admin:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @desc    Mettre à jour automatiquement le statut des réservations passées
// @route   PUT /api/bookings/update-status
// @access  Private/Admin
router.put('/update-status', protect, authorize('admin'), async (req, res) => {
  try {
    const now = new Date();
    
    // Mettre à jour les réservations passées en 'completed'
    const result = await Booking.updateMany(
      {
        status: { $in: ['pending', 'confirmed'] },
        endDate: { $lt: now }
      },
      {
        $set: { status: 'completed' }
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} réservations mises à jour en 'completed'`,
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Erreur mise à jour automatique des statuts:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// @desc    Mettre à jour le statut d'une réservation (Admin)
// @route   PUT /api/bookings/:id/status
// @access  Private/Admin
router.put('/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('userId', 'nom prenom email')
     .populate('boatId', 'name images price');

    if (!booking) {
      return res.status(404).json({ message: 'Réservation non trouvée' });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Erreur mise à jour statut réservation:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;
