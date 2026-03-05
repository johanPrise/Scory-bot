import { bot } from '../../config/bot.js';
import { getActivityHistory } from '../../api/services/activityService.js';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import logger from '../../utils/logger.js';
import { handleError, resolveUserId, trackGroup } from '../utils/helpers.js';

/**
 * Formate une date pour l'affichage
 */
const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return format(date, "d MMMM yyyy 'à' HH:mm", { locale: fr });
  } catch {
    return 'date inconnue';
  }
};

/**
 * Formate l'historique des activités pour l'affichage
 * @param {Array} activities - Documents Activity de MongoDB
 */
const formatHistory = (activities) => {
  if (!activities || activities.length === 0) {
    return '📭 Aucune activité récente trouvée.\n\nCréez une activité avec /createactivity';
  }

  let message = '🕒 *Historique des activités récentes*\n\n';
  
  activities.forEach((activity, index) => {
    const creatorName = activity.createdBy
      ? (activity.createdBy.firstName || activity.createdBy.username || 'Inconnu')
      : 'Inconnu';
    
    message += `📅 *${formatDate(activity.createdAt)}*\n`;
    message += `🏷 *${activity.name}*`;
    
    if (activity.description) {
      message += ` — ${activity.description}`;
    }
    
    message += `\n👤 Créée par ${creatorName}`;
    
    if (activity.subActivities && activity.subActivities.length > 0) {
      message += `\n📎 ${activity.subActivities.length} sous-activité(s)`;
    }
    
    if (activity.stats && activity.stats.totalParticipants > 0) {
      message += `\n👥 ${activity.stats.totalParticipants} participant(s)`;
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
  const count = match[1] || '10';
  const period = match[2] || 'day';

  try {
    // Afficher un message de chargement
    const loadingMsg = await bot.sendMessage(
      chatId,
      '🔄 Récupération de l\'historique...',
      { parse_mode: 'Markdown' }
    );

    // Résoudre l'ID Telegram en ObjectId MongoDB
    const mongoUserId = await resolveUserId(userId);
    if (!mongoUserId) {
      return bot.editMessageText(
        '❌ Vous devez d\'abord vous inscrire avec /start',
        { chat_id: chatId, message_id: loadingMsg.message_id }
      );
    }

    // Tracker le groupe Telegram
    await trackGroup(msg, mongoUserId);

    // Récupérer l'historique
    const history = await getActivityHistory({
      userId: mongoUserId,
      limit: parseInt(count, 10) || 10,
      period: ['day', 'week', 'month', 'year'].includes(period) ? period : 'day',
      chatId: String(chatId)
    });

    // Formater et envoyer la réponse
    const formattedHistory = formatHistory(history);
    
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
