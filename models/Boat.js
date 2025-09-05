import mongoose from 'mongoose';

const boatSchema = new mongoose.Schema({
  nom: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  type: {
    type: String,
    required: true,
    enum: ['voilier', 'yacht', 'catamaran'],
    trim: true
  },
  longueur: { 
    type: Number, 
    required: true,
    min: 2,
    max: 100
  },
  prix_jour: { 
    type: Number, 
    required: true,
    min: 1
  },
  capacite: { 
    type: Number, 
    required: true,
    min: 1,
    max: 50
  },
  image: { 
    type: String, 
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        // Accepter les URLs Firebase Storage ou les chemins locaux
        return v.startsWith('https://firebasestorage.googleapis.com') || 
               v.startsWith('/') || 
               v.startsWith('http://') || 
               v.startsWith('https://');
      },
      message: 'L\'image doit être une URL valide ou un chemin local'
    }
  },
  destination: { 
    type: String, 
    required: true,
    trim: true,
    enum: ['saint-malo', 'les-glenan', 'crozon', 'la-rochelle', 'marseille', 'cannes', 'ajaccio', 'barcelone', 'palma', 'athenes', 'venise', 'amsterdam', 'split']
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  equipements: [{
    type: String,
    trim: true
  }],
  disponible: {
    type: Boolean,
    default: true
  },
  // Une seule disponibilité par bateau
  availability: {
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    price: {
      type: Number,
      min: 0
    },
    notes: {
      type: String,
      default: ''
    }
  },
  // Réservations existantes pour vérifier les conflits
  existingBookings: [{
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['confirmed', 'pending', 'cancelled'],
      default: 'confirmed'
    }
  }],
  proprietaire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { 
  timestamps: true 
});

// Index pour améliorer les performances
boatSchema.index({ proprietaire: 1, createdAt: -1 });
boatSchema.index({ type: 1 });
boatSchema.index({ destination: 1 });

// Méthode pour vérifier la disponibilité
boatSchema.methods.isAvailable = function() {
  return this.disponible;
};

// Méthode pour calculer le prix total pour X jours
boatSchema.methods.calculatePrice = function(days) {
  return this.prix_jour * days;
};

// Méthode pour vérifier si une période est disponible
boatSchema.methods.isPeriodAvailable = function(startDate, endDate) {
  // Vérifier d'abord si la période est dans la disponibilité générale
  if (!this.availability || !this.availability.startDate || !this.availability.endDate) {
    return false;
  }
  
  const availabilityStart = new Date(this.availability.startDate);
  const availabilityEnd = new Date(this.availability.endDate);
  const requestedStart = new Date(startDate);
  const requestedEnd = new Date(endDate);
  
  // Réinitialiser l'heure pour la comparaison
  availabilityStart.setHours(0, 0, 0, 0);
  availabilityEnd.setHours(0, 0, 0, 0);
  requestedStart.setHours(0, 0, 0, 0);
  requestedEnd.setHours(0, 0, 0, 0);
  
  // Vérifier si la période demandée est dans la disponibilité générale
  if (requestedStart < availabilityStart || requestedEnd > availabilityEnd) {
    return false;
  }
  
  // Vérifier les conflits avec les réservations existantes
  if (this.existingBookings && this.existingBookings.length > 0) {
    for (const booking of this.existingBookings) {
      if (booking.status === 'cancelled') continue;
      
      const bookingStart = new Date(booking.startDate);
      const bookingEnd = new Date(booking.endDate);
      
      // Réinitialiser l'heure pour la comparaison
      bookingStart.setHours(0, 0, 0, 0);
      bookingEnd.setHours(0, 0, 0, 0);
      
      // Vérifier s'il y a un chevauchement
      if (!(requestedEnd <= bookingStart || requestedStart >= bookingEnd)) {
        return false; // Conflit détecté
      }
    }
  }
  
  return true;
};

// Méthode pour ajouter une réservation
boatSchema.methods.addBooking = function(startDate, endDate, userId) {
  if (!this.existingBookings) {
    this.existingBookings = [];
  }
  
  this.existingBookings.push({
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    userId: userId,
    status: 'confirmed'
  });
  
  return this.save();
};

const Boat = mongoose.model('Boat', boatSchema);

export default Boat; 