/**
 * Utilitaires pour la création de commandes bot compatibles avec les groupes
 */

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
  return new RegExp(`^\\/${command}(?:@(\\w+))?${params}$`);
}

/**
 * Extrait le nom du bot à partir du texte de la commande si présent
 * @param {string} text - Le texte de la commande
 * @returns {string|null} Le nom du bot ou null si pas de mention
 */
export function extractBotName(text) {
  const match = text.match(/^\/\w+@(\w+)/);
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
  return !mentionedBot || mentionedBot === botName;
}

/**
 * Wrapper pour les handlers de commandes qui vérifie le contexte
 * @param {Function} handler - Le handler original de la commande
 * @param {string} botUsername - Le nom d'utilisateur du bot (sans @)
 * @returns {Function} Handler wrappé qui vérifie le contexte
 */
export function wrapCommandHandler(handler, botUsername) {
  return async (msg, match) => {
    const chatType = msg.chat.type;
    const text = msg.text;
    const isPrivateChat = chatType === 'private';
    const isGroupChat = ['group', 'supergroup'].includes(chatType);
    
    // Dans les chats privés: accepter toutes les commandes
    if (isPrivateChat) {
      return handler(msg, match);
    }
    
    // Dans les groupes: accepter SEULEMENT les commandes avec @bot_name
    if (isGroupChat) {
      const mentionedBot = extractBotName(text);
      
      // Si pas de mention du bot dans un groupe, ignorer
      if (!mentionedBot) {
        return; // Ne pas réagir
      }
      
      // Si la mention n'est pas pour ce bot, ignorer
      if (mentionedBot !== botUsername) {
        return; // Ne pas réagir
      }
      
      // La commande est pour ce bot, traiter
      return handler(msg, match);
    }
    
    // Pour les autres types de chat (channel, etc.), traiter normalement
    return handler(msg, match);
  };
}