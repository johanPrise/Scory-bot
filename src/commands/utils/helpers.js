import { bot } from '../../config/bot.js';
import User from '../../api/models/User.js';
import ChatGroup from '../../api/models/ChatGroup.js';
import logger from '../../utils/logger.js';

import BotSession from '../../api/models/BotSession.js';

export const userSessions = {
  get: async (userId) => {
    const session = await BotSession.findOne({ userId: String(userId) });
    return session ? { step: session.step, ...session.data } : null;
  },
  set: async (userId, data) => {
    const { step, ...otherData } = data;
    await BotSession.findOneAndUpdate(
      { userId: String(userId) },
      { userId: String(userId), step, data: otherData },
      { upsert: true, new: true }
    );
  },
  delete: async (userId) => {
    await BotSession.deleteOne({ userId: String(userId) });
  }
};

/**
 * Résout un ID Telegram en ObjectId MongoDB
 * @param {number|string} telegramId - L'ID Telegram de l'utilisateur
 * @returns {Promise<string|null>} L'ObjectId MongoDB ou null si non trouvé
 */
export const resolveUserId = async (telegramId) => {
  const user = await User.findOne({ 'telegram.id': String(telegramId) });
  return user ? user._id : null;
};

const resolveTelegramGroupRole = async (chatId, telegramId) => {
  try {
    const member = await bot.getChatMember(chatId, telegramId);
    if (member?.status === 'creator') return 'creator';
    if (member?.status === 'administrator') return 'admin';
    return 'member';
  } catch (error) {
    logger.warn('Impossible de récupérer le rôle Telegram du membre:', {
      chatId,
      telegramId,
      error: error.message
    });
  }

  return null;
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
const resolveOrCreateUser = async (from, chatId) => {
  const existing = await resolveUserId(from.id);
  if (existing) return existing;

  const user = await User.create({
    username: from.username || `user_${from.id}`,
    firstName: from.first_name || '',
    lastName: from.last_name || '',
    telegram: {
      id: String(from.id),
      username: from.username || '',
      chatId: String(chatId),
      linked: true
    },
    status: 'active'
  });
  logger.info(`Utilisateur auto-créé lors du tracking: ${from.id} (${from.first_name})`);
  return user._id;
};

export const trackGroup = async (msg, mongoUserId = null) => {
  try {
    const { chat, from } = msg;
    if (chat.type === 'private') return null;

    const resolvedId = mongoUserId ?? await resolveOrCreateUser(from, chat.id);
    const role = await resolveTelegramGroupRole(chat.id, from.id);

    return await ChatGroup.upsertGroup(
      { chatId: chat.id, title: chat.title || `Groupe ${chat.id}`, type: chat.type },
      { mongoUserId: resolvedId, telegramId: from.id, role }
    );
  } catch (error) {
    logger.error('Erreur lors du tracking du groupe:', {
      chatId: msg?.chat?.id,
      error: error.message,
      stack: error.stack
    });
    return null;
  }
};
