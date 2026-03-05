import { bot } from '../../config/bot.js';
import { getRankingData } from '../../api/services/scoreService.js';
import { Activity } from '../../api/models/activity.js';
import logger from '../../utils/logger.js';
import { handleError, resolveUserId, trackGroup } from '../utils/helpers.js';

/**
 * Formate un classement pour l'affichage
 */
const formatRanking = (ranking, activityName = '') => {
  if (!ranking || ranking.length === 0) {
    return 'Aucun score trouvé pour cette activité.';
  }

  const emojis = ['🥇', '🥈', '🥉'];
  
  let message = `🏆 *Classement ${activityName ? `- ${activityName}` : ''}* 🏆\n\n`;
  
  ranking.forEach((entry, index) => {
    const rankEmoji = emojis[index] || `#${index + 1}`;
    message += `${rankEmoji} *${entry.username}*: ${entry.totalPoints} pts`;
    
    // Ajouter la progression si disponible
    if (entry.previousPosition !== undefined) {
      const positionDiff = entry.previousPosition - index - 1;
      if (positionDiff > 0) {
        message += ` ↑${positionDiff}`;
      } else if (positionDiff < 0) {
        message += ` ↓${Math.abs(positionDiff)}`;
      } else {
        message += ' →';
      }
    }
    
    message += '\n';
  });
  
  return message;
};

/**
 * Gère la commande /ranking pour afficher le classement
 * Format: /ranking [activité]
 */
export default async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const activityNameInput = match[1]; // Le paramètre optionnel (nom de l'activité)

  try {
    // Si pas d'activité spécifiée, afficher une aide
    if (!activityNameInput) {
      return bot.sendMessage(
        chatId,
        '🏆 *Classement*\n\n' +
        'Utilisez: `/ranking nom_activité`\n\n' +
        'Exemple: `/ranking course`\n\n' +
        'Pour voir les activités disponibles: /activities',
        { parse_mode: 'Markdown' }
      );
    }

    // Afficher un message de chargement
    const loadingMsg = await bot.sendMessage(
      chatId,
      '🔄 Chargement du classement...',
      { parse_mode: 'Markdown' }
    );

    // Résoudre l'ID utilisateur et tracker le groupe
    const mongoUserId = await resolveUserId(userId);
    if (mongoUserId) {
      await trackGroup(msg, mongoUserId);
    }

    // Rechercher l'activité par nom (échapper les caractères spéciaux regex)
    const escapedName = activityNameInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const activity = await Activity.findOne({
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
      chatId: chatId.toString()
    });

    if (!activity) {
      return bot.editMessageText(
        `❌ Activité "${activityNameInput}" non trouvée.\n\nCréez-la avec /createactivity ou consultez /activities.`,
        { chat_id: chatId, message_id: loadingMsg.message_id }
      );
    }

    // Récupérer les données de classement avec l'ObjectId
    const ranking = await getRankingData({
      activityId: activity._id.toString(),
      limit: 10,
      period: 'month'
    });

    // Formater et envoyer le classement
    const formattedRanking = formatRanking(ranking, activity.name);
    
    await bot.editMessageText(
      formattedRanking,
      {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      }
    );

    logger.info(`Classement affiché pour l'activité: ${activity.name} (${activity._id})`);

  } catch (error) {
    handleError(chatId, error, 'Erreur lors de la récupération du classement');
  }
};
