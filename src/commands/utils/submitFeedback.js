import { bot } from '../../config/bot.js';
import logger from '../../utils/logger.js';
import { handleError } from './helpers.js';

/**
 * Gère la commande /feedback
 * Format: /feedback <type> <message>
 * Types disponibles: bug, feature, other
 */
export default async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const [_, type, ...messageParts] = match;
  const message = messageParts.join(' ');

  try {
    // Vérifier que le type est fourni
    if (!type) {
      return bot.sendMessage(
        chatId,
        '❌ Veuillez spécifier un type de feedback.\n' +
        'Types disponibles: `bug`, `feature`, `other`\n' +
        'Exemple: `/feedback bug Le bouton ne fonctionne pas`',
        { parse_mode: 'Markdown' }
      );
    }

    // Vérifier que le type est valide
    const validTypes = ['bug', 'feature', 'other'];
    if (!validTypes.includes(type.toLowerCase())) {
      return bot.sendMessage(
        chatId,
        '❌ Type de feedback invalide.\n' +
        'Types disponibles: `bug`, `feature`, `other`\n' +
        'Exemple: `/feedback feature J\'aimerais avoir une nouvelle fonctionnalité`',
        { parse_mode: 'Markdown' }
      );
    }

    // Vérifier que le message est fourni
    if (!message) {
      return bot.sendMessage(
        chatId,
        '❌ Veuillez fournir un message avec votre feedback.\n' +
        'Exemple: `/feedback other J\'ai une suggestion pour améliorer le bot`',
        { parse_mode: 'Markdown' }
      );
    }

    // TODO: Implémenter la logique de stockage du feedback
    // Cette fonctionnalité nécessite un service de feedback qui n'est pas encore implémenté
    
    // Envoyer un message de confirmation
    await bot.sendMessage(
      chatId,
      `✅ Merci pour votre feedback !\n\n` +
      `Type: *${type}*\n` +
      `Message: ${message}\n\n` +
      `Votre feedback a été enregistré et sera examiné par notre équipe.`,
      { parse_mode: 'Markdown' }
    );

    logger.info(`Feedback submitted: ${type} by ${userId} in chat ${chatId}: ${message}`);
  } catch (error) {
    handleError(chatId, error, `Erreur lors de l'envoi du feedback`);
  }
};