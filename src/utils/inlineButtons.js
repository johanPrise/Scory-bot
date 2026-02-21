/**
 * Utilitaires pour créer des boutons inline Telegram
 */

/**
 * Crée un bouton inline avec callback_data
 * @param {string} text - Texte du bouton
 * @param {string} callbackData - Données de callback
 * @returns {Object} Bouton inline Telegram
 */
export const createButton = (text, callbackData) => ({
  text,
  callback_data: callbackData
});

/**
 * Crée un bouton Web App Telegram
 * @param {string} text - Texte du bouton
 * @param {string} url - URL de la Web App
 * @returns {Object} Bouton Web App Telegram
 */
export const createWebAppButton = (text, url) => ({
  text,
  web_app: { url }
});

/**
 * Crée un bouton URL standard
 * @param {string} text - Texte du bouton
 * @param {string} url - URL à ouvrir
 * @returns {Object} Bouton URL Telegram
 */
export const createUrlButton = (text, url) => ({
  text,
  url
});

/**
 * Crée un clavier inline à partir d'un tableau de boutons
 * @param {Array<Array<Object>>} buttons - Tableau 2D de boutons
 * @returns {Object} Configuration reply_markup pour Telegram
 */
export const createInlineKeyboard = (buttons) => ({
  reply_markup: {
    inline_keyboard: buttons
  }
});

export default { createButton, createWebAppButton, createUrlButton, createInlineKeyboard };
