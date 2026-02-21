export { default as help } from './help.js';
export { default as getStats } from './getStats.js';

// Stubs pour les commandes référencées dans commands/index.js mais pas encore implémentées
export const exportData = async (msg) => {
  const { bot } = await import('../../config/bot.js');
  await bot.sendMessage(msg.chat.id, '🚧 La commande /export n\'est pas encore disponible.');
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
