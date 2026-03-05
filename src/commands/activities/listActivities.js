import { bot } from '../../config/bot.js';
import { listActivities as listActivitiesService } from '../../api/services/activityService.js';
import logger from '../../utils/logger.js';
import { handleError, resolveUserId, trackGroup } from '../utils/helpers.js';

/**
 * Formate la liste des activités pour l'affichage
 */
const formatActivitiesList = (activities, includeSubActivities = false) => {
  if (!activities || activities.length === 0) {
    return 'Aucune activité trouvée.';
  }

  let message = '📋 *Liste des activités*\n\n';
  
  activities.forEach(activity => {
    // Activité principale
    message += `🏷 *${activity.name}*`;
    if (activity.description) {
      message += ` - ${activity.description}`;
    }
    message += '\n';

    // Sous-activités
    if (includeSubActivities && activity.subActivities && activity.subActivities.length > 0) {
      activity.subActivities.forEach(subActivity => {
        message += `  └─ ${subActivity.name}`;
        if (subActivity.description) {
          message += ` - ${subActivity.description}`;
        }
        message += '\n';
      });
    }
    
    message += '\n';
  });

  return message;
};

/**
 * Gère la commande /activities pour lister les activités
 * Format: /activities [détails]
 */
export default async (msg) => {
  const chatId = msg.chat.id;
  const isPrivateChat = msg.chat.type === 'private';
  const includeDetails = msg.text && msg.text.includes('détails');

  try {
    // Afficher un message de chargement
    const loadingMsg = await bot.sendMessage(
      chatId,
      '🔄 Récupération de la liste des activités...',
      { parse_mode: 'Markdown' }
    );

    // En chat privé, résoudre l'ID utilisateur pour aussi montrer
    // les activités créées par l'utilisateur dans d'autres chats (groupes)
    let createdBy = null;
    if (isPrivateChat) {
      createdBy = await resolveUserId(msg.from.id);
    }

    // Tracker le groupe Telegram si ce n'est pas un chat privé
    if (!isPrivateChat && createdBy) {
      await trackGroup(msg, createdBy);
    }

    // Récupérer la liste des activités
    const activities = await listActivitiesService({
      includeSubActivities: includeDetails,
      chatId: chatId.toString(),
      createdBy
    });

    // Formater et envoyer la réponse
    const formattedList = formatActivitiesList(activities, includeDetails);
    
    await bot.editMessageText(
      formattedList,
      {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      }
    );

    logger.info(`Liste des activités affichée (${activities.length} activités)`);

  } catch (error) {
    handleError(chatId, error, 'commande /activities');
  }
};
