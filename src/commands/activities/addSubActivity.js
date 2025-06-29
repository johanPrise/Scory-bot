import { bot } from '../../config/bot.js';
import * as activityService from '../../api/services/activityService.js';
import { Activity } from '../../api/models/activity.js';
import logger from '../../utils/logger.js';

/**
 * Gère la commande /addsubactivity pour ajouter une sous-activité
 * Format: /addsubactivity activité_parent nom_sous_activité [score_max] [description]
 */
export const addSubActivity = async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const [_, parentActivityName, subActivityName, scoreMaxStr, ...descriptionParts] = match;
  const description = descriptionParts.join(' ');
  const maxScore = parseInt(scoreMaxStr, 10) || 100;

  try {
    // Vérifier les paramètres
    if (!parentActivityName || !subActivityName) {
      return bot.sendMessage(
        chatId,
        '❌ Format incorrect. Utilisez: /addsubactivity activité_parent nom_sous_activité [score_max] [description]\n' +
        'Exemple: /addsubactivity course 5km 100 Course de 5 kilomètres'
      );
    }

    // Afficher un message de chargement
    const loadingMsg = await bot.sendMessage(
      chatId,
      `🔄 Ajout de la sous-activité à ${parentActivityName}...`,
      { parse_mode: 'Markdown' }
    );

    // Rechercher l'activité parent par nom
    const parentActivity = await Activity.findOne({ 
      name: { $regex: new RegExp(`^${parentActivityName}$`, 'i') },
      chatId: chatId.toString()
    });

    if (!parentActivity) {
      return bot.editMessageText(
        `❌ Activité parent "${parentActivityName}" non trouvée. Créez-la d'abord avec /createactivity.`,
        {
          chat_id: chatId,
          message_id: loadingMsg.message_id
        }
      );
    }

    // Ajouter la sous-activité via le service
    const updatedActivity = await activityService.addSubActivity(
      parentActivity._id.toString(),
      subActivityName,
      maxScore,
      {
        description: description || '',
        createdBy: userId.toString()
      }
    );

    // Trouver la sous-activité ajoutée
    const addedSubActivity = updatedActivity.subActivities.find(sub => 
      sub.name === subActivityName
    );

    // Réponse de succès
    await bot.editMessageText(
      `✅ Sous-activité ajoutée avec succès !\n\n` +
      `🏷 *${parentActivity.name} → ${subActivityName}*\n` +
      `🔢 Score maximum: *${maxScore}*` +
      (description ? `\n📝 ${description}` : '') +
      `\n\nVous pouvez maintenant attribuer des scores avec:\n` +
      `/score @utilisateur ${parentActivity.name}/${subActivityName} points`,
      {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      }
    );

    logger.info(`Nouvelle sous-activité créée: ${parentActivity.name} → ${subActivityName}`);

  } catch (error) {
    logger.error(`Erreur lors de l'ajout de la sous-activité: ${error.message}`, { error });
    
    // Gérer les erreurs
    bot.sendMessage(
      chatId,
      `❌ Erreur lors de l'ajout de la sous-activité: ${error.message}`
    );
  }
};

export default addSubActivity;