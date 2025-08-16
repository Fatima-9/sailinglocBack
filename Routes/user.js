import { Router } from 'express';
import User from '../models/User.js';

const router = Router();

router.put('/update', async (req, res) => {
  try {
    const { id, nom, prenom, email, telephone, password } = req.body;
    const updateFields = { nom, prenom, email, tel: telephone };
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
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour du profil" });
  }
});

export default router; 