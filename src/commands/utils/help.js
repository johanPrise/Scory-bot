import { bot } from '../../config/bot.js';
import { MESSAGES, EMOJIS, COMMANDS } from '../../config/messages.js';

/**
 * Commande /help - Affiche l'aide et la liste des commandes disponibles
 * @param {Object} msg - L'objet message de Telegram
 */
const help = async (msg) => {
  const chatId = msg.chat.id;
  const isPrivateChat = msg.chat.type === 'private';

  // Construire le message d'aide de base
  let helpMessage = MESSAGES.HELP + '\n\n';

  // Ajouter les commandes disponibles
  helpMessage += '*Commandes disponibles :*\n';
  helpMessage += COMMANDS.map(cmd => `/${cmd.command} - ${cmd.description}`).join('\n');

  // Ajouter des exemples si c'est un chat privé
  if (isPrivateChat) {
    helpMessage += '\n\n*Exemples :*\n';
    helpMessage += '• /start - Démarrer le bot\n';
    helpMessage += '• /link ABC123 - Lier votre compte avec le code ABC123\n';
    helpMessage += '• /createactivity "Tournoi d\'échecs" - Créer une nouvelle activité\n';
  }

  try {
    // Envoyer le message d'aide avec un clavier contextuel
    await bot.sendMessage(chatId, helpMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: `${EMOJIS.BOOK} Documentation`, url: 'https://docs.scory-bot.com' },
            { text: `${EMOJIS.GEAR} Paramètres`, callback_data: 'settings' }
          ],
          [
            { text: `${EMOJIS.PEOPLE} Support`, url: 'https://t.me/scory_support' }
          ]
        ]
      }
    });

    // Si c'est un chat de groupe, envoyer un message supplémentaire
    if (!isPrivateChat) {
      await bot.sendMessage(
        chatId,
        `${EMOJIS.INFO} *Astuce :* Envoyez-moi un message privé pour une assistance plus détaillée !`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (error) {
    console.error('Erreur dans la commande /help:', error);
    try {
      // En cas d'erreur avec le Markdown, essayer sans
      await bot.sendMessage(chatId, helpMessage.replace(/[\*_`\[]/g, ''));
    } catch (e) {
      console.error('Échec de l\'envoi du message d\'aide:', e);
      // Dernier recours : envoyer un message d'erreur générique
      try {
        await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL);
      } catch (sendError) {
        console.error('Échec de l\'envoi du message d\'erreur:', sendError);
      }
    }
  }
};

export default help;
