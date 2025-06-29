import { bot } from '../../config/bot.js';
import { getStatistics } from '../../api/services/statisticsService.js';
import logger from '../../utils/logger.js';
import { handleError } from './helpers.js';

/**
 * Gère la commande /stats
 * Format: /stats <type>
 * Types disponibles: user, activity, team
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
        '❌ Veuillez spécifier un type de statistiques.\n' +
        'Types disponibles: `user`, `activity`, `team`\n' +
        'Exemple: `/stats user`',
        { parse_mode: 'Markdown' }
      );
    }

    // Vérifier que le type est valide
    const validTypes = ['user', 'activity', 'team'];
    if (!validTypes.includes(type.toLowerCase())) {
      return bot.sendMessage(
        chatId,
        '❌ Type de statistiques invalide.\n' +
        'Types disponibles: `user`, `activity`, `team`\n' +
        'Exemple: `/stats user`',
        { parse_mode: 'Markdown' }
      );
    }

    // Afficher un message de chargement
    const loadingMsg = await bot.sendMessage(
      chatId,
      `🔄 Récupération des statistiques *${type}*...`,
      { parse_mode: 'Markdown' }
    );

    // Récupérer les statistiques
    const stats = await getStatistics(type.toLowerCase(), userId, chatId);

    // Formater et envoyer les statistiques
    let message = `📊 *Statistiques - ${type}*\n\n`;
    
    if (stats && Object.keys(stats).length > 0) {
      Object.entries(stats).forEach(([key, value]) => {
        message += `*${key}*: ${value}\n`;
      });
    } else {
      message += "Aucune statistique disponible pour le moment.";
    }

    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: 'Markdown'
    });

    logger.info(`Stats retrieved: ${type} by ${userId} in chat ${chatId}`);
  } catch (error) {
    handleError(chatId, error, `Erreur lors de la récupération des statistiques '${type}'`);
  }
};