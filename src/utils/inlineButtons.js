/**
 * Utilitaires pour la création de boutons inline dans Telegram
 */

/**
 * Crée un objet de configuration pour les boutons inline
 * @param {Array} buttons - Tableau de boutons à afficher
 * @returns {Object} Configuration pour reply_markup
 */
export const createInlineKeyboard = (buttons) => {
  return {
    reply_markup: {
      inline_keyboard: buttons
    }
  };
};

/**
 * Crée un bouton simple
 * @param {string} text - Texte du bouton
 * @param {string} callbackData - Données de callback
 * @returns {Object} Configuration du bouton
 */
export const createButton = (text, callbackData) => {
  return { text, callback_data: callbackData };
};

/**
 * Crée un bouton pour ouvrir une Web App Telegram
 * @param {string} text - Texte du bouton
 * @param {string} url - URL de la Web App
 * @returns {Object} Configuration du bouton
 */
export const createWebAppButton = (text, url) => {
  return { text, web_app: { url } };
};

/**
 * Crée un bouton avec URL
 * @param {string} text - Texte du bouton
 * @param {string} url - URL à ouvrir
 * @returns {Object} Configuration du bouton
 */
export const createUrlButton = (text, url) => {
  return { text, url };
};

/**
 * Crée une grille de boutons à partir d'une liste d'éléments
 * @param {Array} items - Liste d'éléments
 * @param {Function} textFn - Fonction pour extraire le texte
 * @param {Function} dataFn - Fonction pour extraire les données de callback
 * @param {number} columns - Nombre de colonnes (défaut: 1)
 * @returns {Array} Grille de boutons
 */
export const createButtonGrid = (items, textFn, dataFn, columns = 1) => {
  const buttons = [];
  const rows = Math.ceil(items.length / columns);
  
  for (let i = 0; i < rows; i++) {
    const row = [];
    for (let j = 0; j < columns; j++) {
      const index = i * columns + j;
      if (index < items.length) {
        const item = items[index];
        row.push(createButton(textFn(item), dataFn(item)));
      }
    }
    if (row.length > 0) {
      buttons.push(row);
    }
  }
  
  return buttons;
};