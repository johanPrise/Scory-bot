import { bot } from '../../config/bot.js';
import { getActivityHistory } from '../../services/activityService.js';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import logger from '../../utils/logger.js';
import { handleError } from '../utils/helpers.js';

/**
 * Formate une date pour l'affichage
 */
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return format(date, "d MMMM yyyy 'à' HH:mm", { locale: fr });
};

/**
 * Formate l'historique des activités pour l'affichage
 */
const formatHistory = (history, userId) => {
  if (!history || history.length === 0) {
    return 'Aucun historique récent.';
  }

  let message = '🕒 *Historique des activités récentes*\n\n';
  
  history.forEach(entry => {
    const isCurrentUser = entry.userId === userId;
    const userMention = isCurrentUser ? 'Vous' : `@${entry.username}`;
    const activityName = entry.activityName || 'Activité inconnue';
    const subActivityInfo = entry.subActivityName ? ` (${entry.subActivityName})` : '';
    
    message += `📅 *${formatDate(entry.timestamp)}*\n`;
    message += `👤 ${userMention} a effectué *${activityName}${subActivityInfo}*`;
    
    if (entry.points) {
      message += ` pour *${entry.points} points*`;
    }
    
    if (entry.comments) {
      message += `\n💬 "${entry.comments}"`;
    }
    
    message += '\n\n';
  });

  return message;
};

/**
 * Gère la commande /history pour afficher l'historique
 * Format: /history [nombre] [mois]
 */
export default async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const [_, count = '10', period = 'day'] = match;

  try {
    // Afficher un message de chargement
    const loadingMsg = await bot.sendMessage(
      chatId,
      '🔄 Récupération de l\'historique...',
      { parse_mode: 'Markdown' }
    );

    // Récupérer l'historique
    const history = await getActivityHistory({
      userId,
      limit: parseInt(count, 10) || 10,
      period: ['day', 'week', 'month', 'year'].includes(period) ? period : 'day',
      chatId
    });

    // Formater et envoyer la réponse
    const formattedHistory = formatHistory(history, userId);
    
    await bot.editMessageText(
      formattedHistory,
      {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      }
    );

    logger.info(`Historique affiché (${history.length} entrées)`);

  } catch (error) {
    handleError(chatId, error, 'Erreur lors de la récupération de l\'historique');
  }
};
