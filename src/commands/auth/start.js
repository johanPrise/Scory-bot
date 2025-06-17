/**
 * Commande /start - Point d'entrée du bot
 * @param {Object} msg - L'objet message de Telegram
 */
import { bot } from '../../config/bot.js';
import { MESSAGES } from '../../config/messages.js';

/**
 * Commande /start - Point d'entrée du bot
 * @param {Object} msg - L'objet message de Telegram
 */
const start = async (msg) => {
  const chatId = msg.chat.id;

  try {
    await bot.sendMessage(chatId, MESSAGES.WELCOME);
    // Configurer les commandes du bot
    await bot.setMyCommands([
      { command: 'start', description: 'Démarrer le bot' },
      { command: 'help', description: 'Afficher l\'aide' },
      { command: 'link', description: 'Lier votre compte' },
      { command: 'activities', description: 'Voir les activités' }
    ]);
  } catch (error) {
    console.error('Erreur dans la commande /start:', error);
    try {
      await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL);
    } catch (e) {
      console.error('Échec de l\'envoi du message d\'erreur:', e);
    }
  }
};

export default start;
