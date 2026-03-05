import { bot } from '../../config/bot.js';
import { getRankingData } from '../../api/services/scoreService.js';
import { Activity } from '../../api/models/activity.js';
import logger from '../../utils/logger.js';
import { handleError, resolveUserId, trackGroup } from '../utils/helpers.js';

/**
 * Formate un sous-classement pour l'affichage
 */
const formatSubRanking = (ranking, activityId, subActivity) => {
  if (!ranking || ranking.length === 0) {
    return `Aucun score trouvé pour la sous-activité ${subActivity}.`;
  }

  const emojis = ['🥇', '🥈', '🥉'];
  
  let message = `🏆 *Classement ${activityId} - ${subActivity}* 🏆\n\n`;
  
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
 * Gère la commande /subranking pour afficher le classement d'une sous-activité
 * Format: /subranking activité sous_activité
 */
export default async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const activityNameInput = match ? match[1] : undefined;
  const subActivity = match ? match[2] : undefined;

  try {
    // Vérifier les paramètres
    if (!activityNameInput || !subActivity) {
      return bot.sendMessage(
        chatId,
        '❌ Format incorrect. Utilisez: /subranking activité sous_activité\n' +
        'Exemple: /subranking course 5km'
      );
    }

    // Afficher un message de chargement
    const loadingMsg = await bot.sendMessage(
      chatId,
      '🔄 Chargement du sous-classement...',
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

    // Créer l'ID de sous-activité avec l'ObjectId de l'activité
    const subActivityId = `${activity._id}:${subActivity.toLowerCase()}`;

    // Récupérer les données de classement
    const ranking = await getRankingData({
      activityId: subActivityId,
      limit: 10,
      period: 'month'
    });

    // Formater et envoyer le classement
    const formattedRanking = formatSubRanking(ranking, activity.name, subActivity);
    
    await bot.editMessageText(
      formattedRanking,
      {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      }
    );

    logger.info(`Sous-classement affiché: ${activityId} - ${subActivity}`);

  } catch (error) {
    handleError(chatId, error, 'Erreur lors de la récupération du sous-classement');
  }
};
