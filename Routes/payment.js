import 'dotenv/config';
import express from 'express';
import Stripe from 'stripe';
import Boat from  '../models/Boat.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Crée une réservation "pending" et une session Stripe Checkout
router.post('/create-checkout-session', protect, async (req, res) => {
  try {
    const { boatId, startDate, endDate, numberOfGuests, specialRequests } = req.body;

    if (!boatId || !startDate || !endDate) {
      return res.status(400).json({ message: 'Paramètres manquants' });
    }

    const boat = await Boat.findById(boatId);
    if (!boat) return res.status(404).json({ message: 'Bateau non trouvé' });

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (!(end >= start)) return res.status(400).json({ message: 'Dates invalides' });

    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const totalPrice = days * Number(boat.prix_jour);
    if (!Number.isFinite(totalPrice) || totalPrice < 1) {
      return res.status(400).json({ message: 'Prix total invalide' });
    }

    // Vérifier qu'il n'y a pas de conflit avec d'autres réservations (pending ou confirmed)
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
      return res.status(400).json({ 
        message: 'Le bateau n\'est pas disponible pour ces dates. Une réservation est déjà en cours ou confirmée.' 
      });
    }

    const booking = await Booking.create({
      userId: req.user.id,
      boatId,
      startDate,
      endDate,
      numberOfGuests,
      specialRequests,
      totalPrice,
      status: 'pending',
      paymentStatus: 'paid'
    });

    const successURL = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelURL = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/cancel?bookingId=${booking._id}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Réservation ${boat.nom || boat.name || 'Bateau'}`,
              images: boat.image ? [boat.image] : undefined
            },
            unit_amount: Math.round(totalPrice * 100)
          },
          quantity: 1
        }
      ],
      metadata: {
        bookingId: String(booking._id),
        boatId: String(boatId),
        userId: String(req.user.id),
        startDate,
        endDate
      },
      customer_email: req.user.email,
      success_url: successURL,
      cancel_url: cancelURL
    });

    await Payment.create({
      bookingId: booking._id,
      totalAmount: totalPrice
    });

    return res.status(200).json({ url: session.url, bookingId: booking._id });
  } catch (err) {
    console.error('Stripe session error', err);
    return res.status(500).json({ message: 'Erreur lors de la création du paiement' });
  }
});

// Vérifie la session après succès et confirme la réservation
router.post('/confirm', protect, async (req, res) => {
  try {
    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ message: 'session_id requis' });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ message: 'Paiement non confirmé' });
    }

    const bookingId = session.metadata?.bookingId;
    if (!bookingId) return res.status(400).json({ message: 'Booking manquant' });

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { paymentStatus: 'paid', status: 'confirmed' },
      { new: true }
    );

    return res.json({ success: true, data: booking });
  } catch (err) {
    console.error('Stripe confirm error', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

export default router;
