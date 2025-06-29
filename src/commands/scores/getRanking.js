import { bot } from '../../config/bot.js';
import { getRankingData } from '../../api/services/scoreService.js';
import logger from '../../utils/logger.js';
import { handleError } from '../utils/helpers.js';

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
  const activityId = match[1]; // Le paramètre optionnel activité

  try {
    // Afficher un message de chargement
    const loadingMsg = await bot.sendMessage(
      chatId,
      '🔄 Chargement du classement...',
      { parse_mode: 'Markdown' }
    );

    // Récupérer les données de classement
    const ranking = await getRankingData({
      activityId,
      limit: 10,
      period: 'month' // Par défaut, classement du mois
    });

    // Formater et envoyer le classement
    const activityName = activityId ? `pour ${activityId}` : 'général';
    const formattedRanking = formatRanking(ranking, activityName);
    
    await bot.editMessageText(
      formattedRanking,
      {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      }
    );

    logger.info(`Classement affiché pour l'activité: ${activityId || 'général'}`);

  } catch (error) {
    handleError(chatId, error, 'Erreur lors de la récupération du classement');
  }
};
