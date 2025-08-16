import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
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
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: false
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 1000
  },
  helpful: {
    type: Number,
    default: 0,
    min: 0
  },
  images: [{
    type: String,
    validate: {
      validator: function(v) {
        return v.length <= 5; // Maximum 5 images par avis
      },
      message: 'Maximum 5 images autorisées par avis'
    }
  }],
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

// Index pour améliorer les performances
reviewSchema.index({ boatId: 1, createdAt: -1 });
reviewSchema.index({ userId: 1, createdAt: -1 });
reviewSchema.index({ rating: 1 });

// Méthode pour calculer la note moyenne d'un bateau
reviewSchema.statics.getAverageRating = async function(boatId) {
  const result = await this.aggregate([
    { $match: { boatId: new mongoose.Types.ObjectId(boatId) } },
    { $group: { _id: null, averageRating: { $avg: '$rating' } } }
  ]);
  
  return result.length > 0 ? Math.round(result[0].averageRating * 10) / 10 : 0;
};

// Méthode pour vérifier si l'utilisateur peut laisser un avis
reviewSchema.statics.canUserReview = async function(userId, boatId, bookingId) {
  // Vérifier si l'utilisateur a une réservation confirmée pour ce bateau
  const booking = await mongoose.model('Booking').findOne({
    _id: bookingId,
    userId: userId,
    boatId: boatId,
    status: 'completed'
  });
  
  return !!booking;
};

// Méthode pour incrémenter le compteur "utile"
reviewSchema.methods.incrementHelpful = function() {
  this.helpful += 1;
  return this.save();
};

const Review = mongoose.model('Review', reviewSchema);

export default Review;
