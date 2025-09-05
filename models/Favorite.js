import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema({
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
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index pour éviter les doublons et améliorer les performances
favoriteSchema.index({ userId: 1, boatId: 1 }, { unique: true });
favoriteSchema.index({ userId: 1, createdAt: -1 });

const Favorite = mongoose.model('Favorite', favoriteSchema);

export default Favorite;
