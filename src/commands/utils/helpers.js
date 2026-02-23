import { bot } from '../../config/bot.js';
import User from '../../api/models/User.js';
import ChatGroup from '../../api/models/ChatGroup.js';
import logger from '../../utils/logger.js';

/**
 * Résout un ID Telegram en ObjectId MongoDB
 * @param {number|string} telegramId - L'ID Telegram de l'utilisateur
 * @returns {Promise<string|null>} L'ObjectId MongoDB ou null si non trouvé
 */
export const resolveUserId = async (telegramId) => {
  const user = await User.findOne({ 'telegram.id': String(telegramId) });
  return user ? user._id : null;
};

/**
 * Gère les erreurs dans les commandes du bot
 * @param {number|Object} chatIdOrMsg - L'ID du chat ou l'objet message
 * @param {Error} error - L'erreur à gérer
 * @param {string} context - Le contexte de l'erreur (nom de la commande)
 */
export const handleError = async (chatIdOrMsg, error, context = 'commande') => {
  const chatId = typeof chatIdOrMsg === 'object' ? chatIdOrMsg.chat.id : chatIdOrMsg;
  
  logger.error(`Erreur dans ${context}:`, {
    message: error?.message || error,
    stack: error?.stack
  });

  try {
    await bot.sendMessage(
      chatId,
      `❌ Une erreur est survenue lors de l'exécution de la ${context}. Veuillez réessayer.`
    );
  } catch (sendError) {
    logger.error('Impossible d\'envoyer le message d\'erreur:', sendError);
  }
};

/**
 * Valide les paramètres d'une commande
 * @param {Array} params - Les paramètres reçus
 * @param {Array} required - Les noms des paramètres requis
 * @returns {Object} - { valid: boolean, missing: string[] }
 */
export const validateParams = (params, required) => {
  const missing = [];
  
  for (let i = 0; i < required.length; i++) {
    if (!params[i] || params[i].trim() === '') {
      missing.push(required[i]);
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
};

/**
 * Enregistre/met à jour automatiquement le groupe Telegram et l'utilisateur
 * Doit être appelé dans chaque commande pour maintenir la liste des groupes à jour
 * @param {Object} msg - L'objet message Telegram
 * @param {string} mongoUserId - L'ObjectId MongoDB de l'utilisateur (optionnel, sera résolu si absent)
 * @returns {Promise<Object|null>} Le document ChatGroup ou null en cas d'erreur
 */
export const trackGroup = async (msg, mongoUserId = null) => {
  try {
    const chat = msg.chat;
    
    // Ne tracker que les groupes, pas les conversations privées
    if (chat.type === 'private') return null;

    // Résoudre l'ID MongoDB si non fourni
    if (!mongoUserId) {
      mongoUserId = await resolveUserId(msg.from.id);
      if (!mongoUserId) return null;
    }

    const group = await ChatGroup.upsertGroup(
      {
        chatId: chat.id,
        title: chat.title || `Groupe ${chat.id}`,
        type: chat.type
      },
      {
        mongoUserId,
        telegramId: msg.from.id
      }
    );

    return group;
  } catch (error) {
    logger.error('Erreur lors du tracking du groupe:', {
      chatId: msg?.chat?.id,
      error: error.message
    });
    return null;
  }
};

