// routes/feedback.js
import express from 'express';
import { saveFeedback } from '../services/feedbackService.js';
import { saveGlobalFeedback } from '../services/globalFeedbackService.js';
import { bot } from '../../config/bot.js'; // Import du bot Telegram
import { sendTelegramNotificationToUser, notifyAdminsNewFeedback } from '../utils/notifications.js';

const router = express.Router();

// POST /api/feedback
router.post('/', async (req, res) => {
  try {
    const { type, message, activityId } = req.body;
    const user = req.user; // supposé injecté par le middleware d'auth
    if (!type || !message) {
      return res.status(400).json({ error: 'Type et message requis' });
    }
    // Optionnel : valider le type
    const validTypes = ['bug', 'feature', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Type de feedback invalide' });
    }
    // On peut lier à une activité ou non
    const username = user?.username || user?.email || 'Anonyme';
    const chatId = user?.telegramId || null;
    // Si activityId fourni, stocker sur l'activité, sinon stocker globalement (à adapter selon vos besoins)
    let feedback;
    if (activityId) {
      feedback = await saveFeedback(activityId, username, message, chatId);
    } else {
      feedback = await saveGlobalFeedback({ type, message, username, chatId });
    }
    // Notifier les admins en temps réel
    await notifyAdminsNewFeedback(req, feedback);
    res.status(201).json({ message: 'Feedback enregistré', feedback });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// GET /api/feedback/global (admin only)
router.get('/global', async (req, res) => {
  try {
    // Vérification permission admin
    if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    const { getAllGlobalFeedback } = await import('../services/globalFeedbackService.js');
    const feedbacks = await getAllGlobalFeedback();
    res.json({ feedbacks });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

export default router;
