import { bot } from '../../config/bot.js';
import Score from '../../api/models/Score.js';
import User from '../../api/models/User.js';
import Team from '../../api/models/Team.js';
import { Activity } from '../../api/models/activity.js';
import logger from '../../utils/logger.js';
import { resolveUserId, trackGroup } from '../utils/helpers.js';

/**
 * Commande /stats — Affiche les statistiques globales
 */
export default async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    const loadingMsg = await bot.sendMessage(chatId, '🔄 Chargement des statistiques...');

    // Résoudre l'ID utilisateur et tracker le groupe
    const mongoUserId = await resolveUserId(userId);
    if (mongoUserId) {
      await trackGroup(msg, mongoUserId);
    }

    // Stats directement depuis les modèles
    const [totalUsers, totalTeams, totalActivities, totalScores] = await Promise.all([
      User.countDocuments({ status: 'active' }),
      Team.countDocuments(),
      Activity.countDocuments(),
      Score.countDocuments({ status: 'approved' })
    ]);

    const message = [
      '📊 *Statistiques Scory*',
      '',
      `👤 Utilisateurs actifs : *${totalUsers}*`,
      `👥 Équipes : *${totalTeams}*`,
      `📋 Activités : *${totalActivities}*`,
      `🏆 Scores enregistrés : *${totalScores}*`,
    ].join('\n');

    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: 'Markdown'
    });

    logger.info(`Stats consultées par ${msg.from.id}`);
  } catch (error) {
    logger.error('Erreur /stats:', error);
    await bot.sendMessage(chatId, '❌ Erreur lors de la récupération des statistiques.');
  }
};