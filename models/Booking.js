import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  boatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Boat',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  numberOfGuests: {
    type: Number,
    required: true,
    min: 1
  },
  specialRequests: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances des requêtes
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ boatId: 1, startDate: 1, endDate: 1 });
bookingSchema.index({ status: 1 });

// Méthode pour vérifier si les dates sont disponibles
bookingSchema.methods.isDateRangeAvailable = function() {
  return this.status !== 'cancelled';
};

// Méthode pour calculer la durée en jours
bookingSchema.methods.getDurationInDays = function() {
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  
  // Réinitialiser l'heure pour la comparaison des dates
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - start.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  // Une réservation d'un jour (même date) compte pour 1 jour
  // Une réservation de plusieurs jours compte le nombre exact de jours
  return Math.max(1, Math.ceil(diffDays));
};

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
