/**
 * Utilitaires pour la création de commandes bot compatibles avec les groupes
 */

const BOT_MENTION_PATTERN = /^\/\w+@(\w+)/;
const GROUP_CHAT_TYPES = new Set(['group', 'supergroup']);

/**
 * Crée une regex qui accepte toutes les variantes de commandes
 * @param {string} command - La commande (ex: "help", "start")
 * @param {string} params - Les paramètres optionnels (ex: "\\s+(.+)", "(?:\\s+(.+))?")
 * @returns {RegExp} Regex qui accepte /cmd et /cmd@bot_name
 */
export function createBotCommand(command, params = '') {
  // Regex qui accepte:
  // /command
  // /command@bot_name
  // /command params
  // /command@bot_name params
  return new RegExp(String.raw`^\/${command}(?:@(\w+))?${params}$`);
}

/**
 * Extrait le nom du bot à partir du texte de la commande si présent
 * @param {string} text - Le texte de la commande
 * @returns {string|null} Le nom du bot ou null si pas de mention
 */
export function extractBotName(text) {
  const match = BOT_MENTION_PATTERN.exec(text);
  return match ? match[1] : null;
}

/**
 * Vérifie si une commande est adressée à un bot spécifique
 * @param {string} text - Le texte de la commande
 * @param {string} botName - Le nom du bot (sans @)
 * @returns {boolean} True si la commande est pour ce bot ou sans mention
 */
export function isCommandForBot(text, botName) {
  const mentionedBot = extractBotName(text);
  // Accepter si pas de mention ou si c'est pour ce bot
  return !mentionedBot || mentionedBot.toLowerCase() === botName.toLowerCase();
}

function adjustCommandMatch(match) {
  // Original: [fullMatch, botMention, param1, param2, ...]
  // Ajusté:   [fullMatch, param1, param2, ...]
  return match ? [match[0], ...match.slice(2)] : match;
}

function getCommandName(text) {
  return text.split(/[\s@]/)[0] || '/commande';
}

function getChatContext(msg) {
  const chatType = msg.chat.type;

  return {
    chatId: msg.chat.id,
    isGroupChat: GROUP_CHAT_TYPES.has(chatType),
    isPrivateChat: chatType === 'private',
    text: msg.text || '',
  };
}

function getScopeRestrictionMessage({ scope, isGroupChat, isPrivateChat }) {
  if (scope === 'private' && isGroupChat) {
    return '💬 Cette commande est disponible uniquement en message privé avec le bot.';
  }

  if (scope === 'group' && isPrivateChat) {
    return '👥 Cette commande est disponible uniquement dans les groupes.';
  }

  return null;
}

function isExplicitlyForAnotherBot(text, botUsername) {
  const mentionedBot = extractBotName(text);
  return mentionedBot && mentionedBot.toLowerCase() !== botUsername.toLowerCase();
}

async function executeCommandHandler({ handler, msg, match, text, chatId, detailedError }) {
  try {
    return await handler(msg, match);
  } catch (error) {
    const { bot } = await import('../../config/bot.js');
    const logger = (await import('../../utils/logger.js')).default;
    const cmdName = getCommandName(text);
    logger.error(`Erreur dans ${cmdName}:`, { message: error.message, stack: error.stack });

    if (!detailedError) {
      return bot.sendMessage(chatId, '❌ Une erreur est survenue. Veuillez réessayer.');
    }

    return bot.sendMessage(
      chatId,
      `❌ Une erreur est survenue lors de l'exécution de ${cmdName}. Veuillez réessayer.\n\n_Détail: ${error.message}_`,
      { parse_mode: 'Markdown' }
    );
  }
}

/**
 * Wrapper pour les handlers de commandes qui vérifie le contexte
 * @param {Function} handler - Le handler original de la commande
 * @param {string} botUsername - Le nom d'utilisateur du bot (sans @)
 * @param {Object} options - Options supplémentaires
 * @param {string} options.scope - 'private' | 'group' | 'both' (défaut: 'both')
 * @returns {Function} Handler wrappé qui vérifie le contexte
 */
export function wrapCommandHandler(handler, botUsername, options = {}) {
  const { scope = 'both' } = options;
  
  return async (msg, match) => {
    const context = getChatContext(msg);
    const adjustedMatch = adjustCommandMatch(match);
    const scopeRestrictionMessage = getScopeRestrictionMessage({ scope, ...context });

    if (scopeRestrictionMessage) {
      const { bot } = await import('../../config/bot.js');
      return bot.sendMessage(context.chatId, scopeRestrictionMessage);
    }

    if (context.isGroupChat && isExplicitlyForAnotherBot(context.text, botUsername)) {
      return;
    }

    return executeCommandHandler({
      handler,
      msg,
      match: adjustedMatch,
      text: context.text,
      chatId: context.chatId,
      detailedError: context.isPrivateChat || context.isGroupChat,
    });
  };
}
