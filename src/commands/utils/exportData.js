import { bot } from '../../config/bot.js';
import logger from '../../utils/logger.js';
import { handleError } from './helpers.js';

/**
 * Gère la commande /export
 * Format: /export <type>
 * Types disponibles: scores, activities, teams
 */
export default async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const [_, type] = match;

  try {
    // Vérifier que le type est fourni
    if (!type) {
      return bot.sendMessage(
        chatId,
        '❌ Veuillez spécifier un type de données à exporter.\n' +
        'Types disponibles: `scores`, `activities`, `teams`\n' +
        'Exemple: `/export scores`',
        { parse_mode: 'Markdown' }
      );
    }

    // Vérifier que le type est valide
    const validTypes = ['scores', 'activities', 'teams'];
    if (!validTypes.includes(type.toLowerCase())) {
      return bot.sendMessage(
        chatId,
        '❌ Type de données invalide.\n' +
        'Types disponibles: `scores`, `activities`, `teams`\n' +
        'Exemple: `/export scores`',
        { parse_mode: 'Markdown' }
      );
    }

    // Afficher un message de chargement
    const loadingMsg = await bot.sendMessage(
      chatId,
      `🔄 Préparation de l'export des données *${type}*...`,
      { parse_mode: 'Markdown' }
    );

    // TODO: Implémenter la logique d'export des données
    // Cette fonctionnalité nécessite un service d'export qui n'est pas encore implémenté
    
    // Message temporaire
    await bot.editMessageText(
      `🚧 La fonctionnalité d'export des données *${type}* est en cours de développement.\n\n` +
      `Cette commande sera disponible dans une prochaine version.`,
      {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      }
    );

    logger.info(`Export data requested: ${type} by ${userId} in chat ${chatId}`);
  } catch (error) {
    handleError(chatId, error, `Erreur lors de l'export des données '${type}'`);
  }
};