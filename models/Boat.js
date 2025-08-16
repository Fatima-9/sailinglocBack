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
    enum: ['voilier', 'bateau à moteur', 'catamaran'],
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

const Boat = mongoose.model('Boat', boatSchema);

export default Boat; 