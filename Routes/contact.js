import { Router } from 'express';
import nodemailer from 'nodemailer';

const router = Router();

router.post('/', async (req, res) => {
  const { nom, prenom, telephone, message, email } = req.body;
  try {
    // Configure le transporteur SMTP (ici Gmail)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER, // à mettre dans .env
        pass: process.env.MAIL_PASS  // à mettre dans .env
      }
    });

    // Contenu de l'email
    const mailOptions = {
      from: process.env.MAIL_USER,
      to: 'sailinglocequipe@gmail.com',
      replyTo: email, // <-- pour que la réponse aille à l'utilisateur
      subject: 'Nouveau message depuis le formulaire de contact SailingLoc',
      text: `Nom: ${nom}\nPrénom: ${prenom}\nTéléphone: ${telephone}\nEmail: ${email}\n\nMessage:\n${message}`
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Message envoyé avec succès !' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de l\'envoi du message.' });
  }
});

export default router; 