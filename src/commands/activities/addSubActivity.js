import { bot } from '../../config/bot.js';
import { addSubActivity as addSubActivityService } from '../../services/activityService.js';
import logger from '../../utils/logger.js';
import { handleError } from '../utils/helpers.js';

/**
 * Gère la commande /addsubactivity pour ajouter une sous-activité
 * Format: /addsubactivity activité_parent nom_sous_activité [description]
 */
export default async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const [_, parentActivity, subActivityInfo] = match;
  
  // Séparer le nom de la description (si fournie)
  const [name, ...descriptionParts] = (subActivityInfo || '').split(' ');
  const description = descriptionParts.join(' ');

  try {
    // Vérifier les paramètres
    if (!parentActivity || !name) {
      return bot.sendMessage(
        chatId,
        '❌ Format incorrect. Utilisez: /addsubactivity activité_parent nom_sous_activité [description]\n' +
        'Exemple: /addsubactivity course 5km Course de 5 kilomètres'
      );
    }

    // Afficher un message de chargement
    const loadingMsg = await bot.sendMessage(
      chatId,
      `🔄 Ajout de la sous-activité à ${parentActivity}...`,
      { parse_mode: 'Markdown' }
    );

    // Ajouter la sous-activité via le service
    const subActivity = await addSubActivityService({
      parentActivityName: parentActivity,
      name,
      description: description || null,
      createdBy: userId,
      chatId
    });

    // Réponse de succès
    await bot.editMessageText(
      `✅ Sous-activité ajoutée avec succès !\n` +
      `🏷 *${parentActivity} → ${subActivity.name}*` +
      (subActivity.description ? `\n📝 ${subActivity.description}` : ''),
      {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      }
    );

    logger.info(`Nouvelle sous-activité créée: ${parentActivity} → ${subActivity.name} (${subActivity.id})`);

  } catch (error) {
    handleError(chatId, error, 'Erreur lors de l\'ajout de la sous-activité');
  }
};
