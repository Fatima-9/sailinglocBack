import mongoose from 'mongoose';

const availabilitySchema = new mongoose.Schema({
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
  price: {
    type: Number,
    min: 0
  },
  notes: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index pour optimiser les requêtes
availabilitySchema.index({ boatId: 1, startDate: 1, endDate: 1 });
availabilitySchema.index({ startDate: 1, endDate: 1 });

// Validation personnalisée pour s'assurer que endDate >= startDate (permet la réservation d'un seul jour)
availabilitySchema.pre('validate', function(next) {
  if (this.startDate && this.endDate && this.startDate > this.endDate) {
    next(new Error('La date de fin doit être égale ou postérieure à la date de début'));
  } else {
    next();
  }
});

// Méthode statique pour vérifier les conflits de disponibilité
availabilitySchema.statics.checkConflicts = async function(boatId, startDate, endDate, excludeId = null) {
  const query = {
    boatId,
    isActive: true,
    $or: [
      // Nouvelle période commence pendant une période existante
      { startDate: { $lt: endDate, $gte: startDate } },
      // Nouvelle période se termine pendant une période existante
      { endDate: { $gt: startDate, $lte: endDate } },
      // Nouvelle période englobe complètement une période existante
      { startDate: { $gte: startDate }, endDate: { $lte: endDate } }
    ]
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return await this.find(query);
};

// Méthode pour vérifier si une date est disponible
availabilitySchema.statics.isDateAvailable = async function(boatId, date) {
  const availability = await this.findOne({
    boatId,
    isActive: true,
    startDate: { $lte: date },
    endDate: { $gte: date }
  });

  return !!availability;
};

const Availability = mongoose.model('Availability', availabilitySchema);

export default Availability;
