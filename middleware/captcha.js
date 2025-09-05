// Middleware de validation du CAPTCHA
export const validateCaptcha = (req, res, next) => {
  const { captchaQuestion, captchaAnswer, userAnswer } = req.body;

  // Vérifier que tous les champs CAPTCHA sont présents
  if (!captchaQuestion || !captchaAnswer || !userAnswer) {
    return res.status(400).json({
      message: "Vérification CAPTCHA requise. Veuillez recopier le code affiché."
    });
  }

  // Vérifier que la réponse est correcte (insensible à la casse)
  if (userAnswer.toUpperCase() !== captchaAnswer.toUpperCase()) {
    return res.status(400).json({
      message: "Code CAPTCHA incorrect. Veuillez réessayer."
    });
  }

  // Si tout est correct, passer au middleware suivant
  next();
};

// Fonction utilitaire pour générer un CAPTCHA côté serveur (optionnel)
export const generateServerCaptcha = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return {
    question: result,
    answer: result
  };
};
