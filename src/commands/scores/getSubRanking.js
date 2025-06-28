import { bot } from '../../config/bot.js';
import { getRankingData } from '../../services/scoreService.js';
import logger from '../../utils/logger.js';
import { handleError } from '../utils/helpers.js';

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
  const [_, activityId, subActivity] = match;

  try {
    // Vérifier les paramètres
    if (!activityId || !subActivity) {
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

    // Créer l'ID de sous-activité
    const subActivityId = `${activityId}:${subActivity.toLowerCase()}`;

    // Récupérer les données de classement
    const ranking = await getRankingData({
      activityId: subActivityId,
      limit: 10,
      period: 'month' // Par défaut, classement du mois
    });

    // Formater et envoyer le classement
    const formattedRanking = formatSubRanking(ranking, activityId, subActivity);
    
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
