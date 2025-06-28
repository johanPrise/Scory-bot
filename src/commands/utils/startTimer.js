import { bot } from '../../config/bot.js';
import logger from '../../utils/logger.js';
import { handleError } from './helpers.js';

// Map pour stocker les timers actifs
const activeTimers = new Map();

/**
 * Gère la commande /starttimer
 * Format: /starttimer <nom> <durée_en_minutes>
 */
export default async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const [_, timerName, durationStr] = match;
  const durationMinutes = parseInt(durationStr, 10);

  try {
    // Vérifier que le nom du timer est fourni
    if (!timerName) {
      return bot.sendMessage(
        chatId,
        '❌ Veuillez spécifier un nom pour le timer.\n' +
        'Exemple: `/starttimer Pause 15`',
        { parse_mode: 'Markdown' }
      );
    }

    // Vérifier que la durée est fournie et valide
    if (!durationStr || isNaN(durationMinutes) || durationMinutes <= 0) {
      return bot.sendMessage(
        chatId,
        '❌ Veuillez spécifier une durée valide en minutes.\n' +
        'Exemple: `/starttimer Pause 15`',
        { parse_mode: 'Markdown' }
      );
    }

    // Vérifier si un timer avec ce nom existe déjà pour ce chat
    const timerKey = `${chatId}_${timerName}`;
    if (activeTimers.has(timerKey)) {
      return bot.sendMessage(
        chatId,
        `❌ Un timer nommé *${timerName}* est déjà en cours dans ce chat.\n` +
        `Utilisez \`/stoptimer ${timerName}\` pour l'arrêter.`,
        { parse_mode: 'Markdown' }
      );
    }

    // Calculer l'heure de fin
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
    const endTimeStr = endTime.toLocaleTimeString();

    // Envoyer un message de confirmation
    const message = await bot.sendMessage(
      chatId,
      `⏱ Timer *${timerName}* démarré pour *${durationMinutes} minutes*.\n` +
      `Fin prévue à: *${endTimeStr}*\n\n` +
      `Utilisez \`/stoptimer ${timerName}\` pour l'arrêter avant la fin.`,
      { parse_mode: 'Markdown' }
    );

    // Créer le timer
    const timer = {
      name: timerName,
      startTime,
      endTime,
      duration: durationMinutes,
      messageId: message.message_id,
      userId,
      timeoutId: setTimeout(() => {
        // Envoyer un message quand le timer est terminé
        bot.sendMessage(
          chatId,
          `⏰ Le timer *${timerName}* est terminé !`,
          { parse_mode: 'Markdown' }
        );
        
        // Supprimer le timer de la map
        activeTimers.delete(timerKey);
      }, durationMinutes * 60000)
    };

    // Stocker le timer
    activeTimers.set(timerKey, timer);

    logger.info(`Timer started: ${timerName} for ${durationMinutes} minutes by ${userId} in chat ${chatId}`);
  } catch (error) {
    handleError(chatId, error, `Erreur lors du démarrage du timer '${timerName}'`);
  }
};