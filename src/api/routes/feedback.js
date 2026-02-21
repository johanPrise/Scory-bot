import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import logger from '../../utils/logger.js';

const router = express.Router();

router.use(authMiddleware);

// POST /api/feedback
router.post('/', asyncHandler(async (req, res) => {
  const { type, message } = req.body;
  
  if (!type || !message) {
    throw createError(400, 'Type et message requis');
  }

  const validTypes = ['bug', 'feature', 'other'];
  if (!validTypes.includes(type)) {
    throw createError(400, 'Type de feedback invalide. Utilisez: bug, feature, other');
  }

  // Pour l'instant, on log le feedback — à connecter à un modèle plus tard
  logger.info('Feedback reçu', {
    type,
    message,
    userId: req.userId,
    username: req.user.username
  });

  res.status(201).json({
    message: 'Feedback enregistré, merci !',
    feedback: { type, message, createdAt: new Date() }
  });
}));

export default router;
