export { default as help } from './help.js';
export { default as getStats } from './getStats.js';

// Stubs pour les commandes référencées dans commands/index.js mais pas encore implémentées
export const exportData = async (msg) => {
  const { bot } = await import('../../config/bot.js');
  const chatId = msg.chat.id;

  try {
    const loadingMsg = await bot.sendMessage(
      chatId, 
      '⏳ Préparation de l\'export de vos données en cours...', 
      { parse_mode: 'Markdown' }
    );
    
    // Simulation du temps de traitement
    setTimeout(async () => {
      // Pour éviter les crashs liés à Telegraf, on utilise explicitement l'API node-telegram-bot-api
      // avec Buffer comme file payload si on voulait, mais ici on répond juste proprement.
      await bot.editMessageText(
        '🚧 *Export CSV*\nCette fonctionnalité (génération des buffers CSV) est en phase de développement. Bientôt disponible !',
        { chat_id: chatId, message_id: loadingMsg.message_id, parse_mode: 'Markdown' }
      );
    }, 1500);

  } catch (error) {
    await bot.sendMessage(chatId, '❌ Une erreur est survenue lors de l\'export.');
  }
};

export const submitFeedback = async (msg) => {
  const { bot } = await import('../../config/bot.js');
  await bot.sendMessage(msg.chat.id, '🚧 La commande /feedback n\'est pas encore disponible.');
};

export const startTimer = async (msg) => {
  const { bot } = await import('../../config/bot.js');
  await bot.sendMessage(msg.chat.id, '🚧 La commande /starttimer n\'est pas encore disponible.');
};

export const stopTimer = async (msg) => {
  const { bot } = await import('../../config/bot.js');
  await bot.sendMessage(msg.chat.id, '🚧 La commande /stoptimer n\'est pas encore disponible.');
};
