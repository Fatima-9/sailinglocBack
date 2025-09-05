import { Router } from 'express';
import User from '../models/User.js';
import Boat from '../models/Boat.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.put('/update', async (req, res) => {
  try {
    const { id, nom, prenom, email, telephone, password, siret, siren } = req.body;
    const updateFields = { nom, prenom, email, tel: telephone };
    
    // Ajouter SIRET et SIREN si fournis
    if (siret !== undefined) updateFields.siret = siret;
    if (siren !== undefined) updateFields.siren = siren;
    
    if (password && password.trim() !== '') {
      // Hash du mot de passe si modifié
      const bcrypt = await import('bcryptjs');
      updateFields.password = await bcrypt.default.hash(password, 10);
    }
    
    const user = await User.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );
    
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
    
    res.json({
      user: {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        tel: user.tel,
        role: user.role,
        siret: user.siret,
        siren: user.siren
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour du profil" });
  }
});

// Endpoint pour supprimer le compte utilisateur
router.delete('/delete-account', protect, async (req, res) => {
  try {
    // Récupérer l'ID de l'utilisateur depuis le token JWT
    const userId = req.user._id; // Changé de req.user.id à req.user._id
    
    if (!userId) {
      return res.status(401).json({ message: "Token d'authentification invalide" });
    }

    // Vérifier que l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Supprimer tous les bateaux appartenant à l'utilisateur
    await Boat.deleteMany({ proprietaire: userId });
    console.log(`Bateaux supprimés pour l'utilisateur ${userId}`);

    // Supprimer toutes les réservations de l'utilisateur
    await Booking.deleteMany({ 
      $or: [
        { utilisateur: userId },
        { proprietaire: userId }
      ]
    });
    console.log(`Réservations supprimées pour l'utilisateur ${userId}`);

    // Supprimer toutes les reviews de l'utilisateur
    await Review.deleteMany({ 
      $or: [
        { utilisateur: userId },
        { bateau: { $in: await Boat.find({ proprietaire: userId }).select('_id') } }
      ]
    });
    console.log(`Reviews supprimées pour l'utilisateur ${userId}`);

    // Supprimer l'utilisateur lui-même
    await User.findByIdAndDelete(userId);
    console.log(`Utilisateur ${userId} supprimé avec succès`);

    res.json({ 
      message: "Compte supprimé avec succès",
      details: "Toutes vos données ont été définitivement supprimées"
    });

  } catch (error) {
    console.error('Erreur lors de la suppression du compte:', error);
    res.status(500).json({ 
      message: "Erreur lors de la suppression du compte",
      error: error.message 
    });
  }
});

export default router; 