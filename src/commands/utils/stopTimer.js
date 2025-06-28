import { bot } from '../../config/bot.js';
import logger from '../../utils/logger.js';
import { handleError } from './helpers.js';

// Référence à la map des timers actifs définie dans startTimer.js
// Note: Dans une implémentation réelle, cette map devrait être partagée via un module séparé
const activeTimers = new Map();

/**
 * Gère la commande /stoptimer
 * Format: /stoptimer <nom>
 */
export default async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const [_, timerName] = match;

  try {
    // Vérifier que le nom du timer est fourni
    if (!timerName) {
      return bot.sendMessage(
        chatId,
        '❌ Veuillez spécifier le nom du timer à arrêter.\n' +
        'Exemple: `/stoptimer Pause`',
        { parse_mode: 'Markdown' }
      );
    }

    // Vérifier si le timer existe
    const timerKey = `${chatId}_${timerName}`;
    const timer = activeTimers.get(timerKey);
    
    if (!timer) {
      return bot.sendMessage(
        chatId,
        `❌ Aucun timer nommé *${timerName}* n'est actif dans ce chat.`,
        { parse_mode: 'Markdown' }
      );
    }

    // Arrêter le timer
    clearTimeout(timer.timeoutId);
    
    // Calculer la durée écoulée
    const now = new Date();
    const elapsedMs = now - timer.startTime;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    const elapsedSeconds = Math.floor((elapsedMs % 60000) / 1000);
    
    // Envoyer un message de confirmation
    await bot.sendMessage(
      chatId,
      `⏹ Timer *${timerName}* arrêté.\n` +
      `Durée écoulée: *${elapsedMinutes} min ${elapsedSeconds} sec* sur *${timer.duration} min* prévues.`,
      { parse_mode: 'Markdown' }
    );
    
    // Supprimer le timer de la map
    activeTimers.delete(timerKey);

    logger.info(`Timer stopped: ${timerName} by ${userId} in chat ${chatId} after ${elapsedMinutes}m${elapsedSeconds}s`);
  } catch (error) {
    handleError(chatId, error, `Erreur lors de l'arrêt du timer '${timerName}'`);
  }
};