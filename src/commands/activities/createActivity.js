import { bot } from '../../config/bot.js';
import { createActivity as createActivityService } from '../../services/activityService.js';
import logger from '../../utils/logger.js';
import { handleError } from '../utils/helpers.js';

/**
 * Gère la commande /createactivity pour créer une nouvelle activité
 * Format: /createactivity nom_activité [description]
 */
export default async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const activityInfo = match[1].trim();
  
  // Séparer le nom de la description (si fournie)
  const [name, ...descriptionParts] = activityInfo.split(' ');
  const description = descriptionParts.join(' ');

  try {
    // Vérifier les paramètres
    if (!name) {
      return bot.sendMessage(
        chatId,
        '❌ Format incorrect. Utilisez: /createactivity nom_activité [description]\n' +
        'Exemple: /createactivity course Course à pied du matin'
      );
    }

    // Afficher un message de chargement
    const loadingMsg = await bot.sendMessage(
      chatId,
      '🔄 Création de l\'activité en cours...',
      { parse_mode: 'Markdown' }
    );

    // Créer l'activité via le service
    const activity = await createActivityService({
      name,
      description: description || null,
      createdBy: userId,
      chatId
    });

    // Réponse de succès
    await bot.editMessageText(
      `✅ Activité créée avec succès !\n` +
      `🏷 *${activity.name}*` +
      (activity.description ? `\n📝 ${activity.description}` : ''),
      {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      }
    );

    logger.info(`Nouvelle activité créée: ${activity.name} (${activity.id})`);

  } catch (error) {
    handleError(chatId, error, 'Erreur lors de la création de l\'activité');
  }
};
