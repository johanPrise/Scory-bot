import { bot } from '../../config/bot.js';
import * as activityService from '../../api/services/activityService.js';
import logger from '../../utils/logger.js';

/**
 * Gère la commande /createactivity pour créer une nouvelle activité
 * Format: /createactivity nom_activité [description]
 */
export const createActivity = async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const [_, name, ...descriptionParts] = match;
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
    const activity = await activityService.createActivity({
      name,
      description: description || '',
      createdBy: userId.toString(),
      chatId: chatId.toString()
    });

    // Réponse de succès
    await bot.editMessageText(
      `✅ Activité créée avec succès !\n\n` +
      `🏷 *${activity.name}*` +
      (activity.description ? `\n📝 ${activity.description}` : '') +
      `\n\nVous pouvez maintenant:\n` +
      `- Ajouter des sous-activités avec /addsubactivity ${activity.name} nom_sous_activité [score_max]\n` +
      `- Attribuer des scores avec /score @utilisateur ${activity.name} points`,
      {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      }
    );

    logger.info(`Nouvelle activité créée: ${activity.name} (${activity._id})`);

  } catch (error) {
    logger.error(`Erreur lors de la création de l'activité: ${error.message}`, { error });
    
    // Gérer les erreurs
    bot.sendMessage(
      chatId,
      `❌ Erreur lors de la création de l'activité: ${error.message}`
    );
  }
};

export default createActivity;