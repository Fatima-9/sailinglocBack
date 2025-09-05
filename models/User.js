import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  tel: { type: String },
  role: {
    type: String,
    enum: ['admin', 'client', 'proprietaire'],
    default: 'client'
  },
  isProfessionnel: {
    type: Boolean,
    default: false
  },
  siret: { 
    type: String, 
    required: function() { return this.role === 'proprietaire' && this.isProfessionnel; },
    validate: {
      validator: function(v) {
        if (this.role === 'proprietaire' && this.isProfessionnel) {
          return /^\d{14}$/.test(v);
        }
        return true;
      },
      message: 'Le SIRET doit contenir exactement 14 chiffres pour les professionnels'
    }
  },
  siren: { 
    type: String, 
    required: function() { return this.role === 'proprietaire' && this.isProfessionnel; },
    validate: {
      validator: function(v) {
        if (this.role === 'proprietaire' && this.isProfessionnel) {
          return /^\d{9}$/.test(v);
        }
        return true;
      },
      message: 'Le SIREN doit contenir exactement 9 chiffres pour les professionnels'
    }
  },
  status: {
    type: String,
    enum: ['actif', 'inactif', 'suspendu'],
    default: 'actif'
  }
}, { timestamps: true });

// Hash du mot de passe avant enregistrement
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Comparaison de mot de passe pour le login
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
