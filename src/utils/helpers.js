import logger from './logger.js';

/**
 * Répond élégamment à l'utilisateur en cas d'erreur.
 * Compatible avec node-telegram-bot-api (ctx = msg ou CallbackQuery).
 * @param {object} ctx - message ou callbackQuery.
 * @param {Error} err - erreur capturée.
 * @param {string} fallbackMsg - message par défaut si autre échec.
 */
export async function handleError(ctx, err, fallbackMsg = '❌ Une erreur est survenue.') {
  logger.error('handleError', { error: err.message, stack: err.stack });

  const chatId = ctx?.chat?.id || ctx?.message?.chat?.id;
  try {
    // Si on dispose du bot via ctx.bot (pas le cas ici → handlers l'appellent directement)
    if (typeof ctx.reply === 'function') {
      await ctx.reply(fallbackMsg);
    } else if (ctx.bot && typeof ctx.bot.sendMessage === 'function') {
      await ctx.bot.sendMessage(chatId, fallbackMsg);
    }
  } catch (e) {
    logger.error('Impossible d\'envoyer le message d\'erreur', e);
  }
}

/**
 * Valide simplement le nombre de paramètres extraits via la RegExp match[]
 * @param {Array} match - tableau retourné par RegExp exec / onText.
 * @param {number} count - nombre minimal de paramètres attendus.
 * @throws Error si insuffisant.
 */
export function validateParams(match, count) {
  if (!match || match.length - 1 < count) {
    throw new Error('Paramètres insuffisants.');
  }
  return match.slice(1, count + 1);
}
