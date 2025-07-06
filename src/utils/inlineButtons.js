/**
 * Utilitaires de création de claviers Inline Telegram
 * Toutes les fonctions retournent des objets prêts à être passés à node-telegram-bot-api.
 */

/**
 * Crée un bouton WebApp qui ouvre une URL dans Telegram.
 * @param {string} label - Texte du bouton.
 * @param {string} url - URL HTTPS de la WebApp.
 */
export function createWebAppButton(label, url) {
  return {
    text: label,
    web_app: { url }
  };
}

/**
 * Crée un bouton standard qui envoie un callback_data.
 * @param {string} label - Texte du bouton.
 * @param {string} callbackData - Donnée renvoyée lors du click.
 */
export function createButton(label, callbackData) {
  return {
    text: label,
    callback_data: callbackData
  };
}

/**
 * Transforme un tableau de rangées de boutons en objet reply_markup.
 * @param {Array<Array<Object>>} rows - [[button1, button2], [button3]]
 */
export function createInlineKeyboard(rows) {
  return {
    reply_markup: {
      inline_keyboard: rows
    }
  };
}
