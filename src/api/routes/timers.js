// routes/timers.js
import express from 'express';
import Timer from '../models/Timer.js';
import mongoose from 'mongoose';
import { bot } from '../../config/bot.js'; // Import du bot Telegram
import User from '../models/User.js';
import { notifyActivityParticipantsTimerEnded } from '../utils/notifications.js';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// POST /api/timers/start
router.post('/start', async (req, res) => {
  try {
    const { name, duration, activityId } = req.body;
    if (!name || !duration || isNaN(duration) || duration <= 0) {
      return res.status(400).json({ error: 'Nom et durée valides requis' });
    }
    // Un timer actif du même nom pour la même activité ?
    const existing = await Timer.findOne({ name: String(name), activityId: activityId ? String(activityId) : undefined, running: true });
    if (existing) {
      return res.status(400).json({ error: 'Un timer avec ce nom est déjà actif pour cette activité' });
    }
    const now = new Date();
    const timer = await Timer.create({
      name,
      duration: Number(duration),
      startedAt: now,
      endTime: new Date(now.getTime() + Number(duration) * 60000),
      running: true,
      activityId: activityId ? new mongoose.Types.ObjectId(activityId) : undefined,
      createdBy: req.user?._id
    });
    res.status(201).json({ timer });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// POST /api/timers/stop
router.post('/stop', async (req, res) => {
  try {
    const { name, activityId } = req.body;
    const timer = await Timer.findOne({ name: String(name), activityId: activityId ? String(activityId) : undefined, running: true });
    if (!timer) {
      return res.status(404).json({ error: 'Timer non trouvé ou déjà arrêté' });
    }
    timer.running = false;
    timer.endTime = new Date();
    await timer.save();

    // Notifier tous les participants de l'activité
    if (activityId) {
      await notifyActivityParticipantsTimerEnded(req, activityId, timer);
    }

    res.json({ timer });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

// GET /api/timers
router.get('/', async (req, res) => {
  try {
    const { activityId } = req.query;
    const filter = {};
    if (activityId) filter.activityId = activityId;
    const timers = await Timer.find(filter).sort({ startedAt: -1 });
    res.json({ timers });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

export default router;
