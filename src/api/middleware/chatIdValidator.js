import ChatGroup from '../models/ChatGroup.js';
import logger from '../../utils/logger.js';

const CHAT_ID_PATTERN = /^-?\d+$/;

export const extractChatId = (req) =>
  req.query?.chatId ??
  req.body?.chatId ??
  req.body?.metadata?.chatId ??
  req.params?.chatId;

export const normalizeChatId = (value) => {
  if (value === undefined || value === null || value === '') {
    return { chatId: null, reason: 'missing' };
  }

  if (Array.isArray(value) || typeof value === 'object') {
    return { chatId: null, reason: 'invalid' };
  }

  const chatId = String(value).trim();
  if (!CHAT_ID_PATTERN.test(chatId)) {
    return { chatId: null, reason: 'invalid' };
  }

  return { chatId, reason: null };
};

const rejectMissingChatId = (req, res) => {
  logger.warn('Requête rejetée: chatId manquant', {
    path: req.path,
    method: req.method,
    userId: req.user?._id
  });

  return res.status(400).json({
    error: 'chatId is required',
    message: 'All operations must be scoped to a specific Telegram group. Please provide a chatId parameter.'
  });
};

const rejectInvalidChatId = (req, res) => {
  logger.warn('Requête rejetée: chatId invalide', {
    path: req.path,
    method: req.method,
    userId: req.user?._id
  });

  return res.status(400).json({
    error: 'Invalid chatId',
    message: 'chatId must be a Telegram chat identifier containing only digits and an optional leading minus sign.'
  });
};

/**
 * Middleware pour exiger la présence d'un chatId dans les requêtes
 * Rejette les requêtes sans chatId avec une erreur 400
 */
export const requireChatId = (req, res, next) => {
  const { chatId, reason } = normalizeChatId(extractChatId(req));

  if (reason === 'missing') return rejectMissingChatId(req, res);
  if (reason === 'invalid') return rejectInvalidChatId(req, res);
  
  // Attacher le chatId à la requête pour utilisation ultérieure
  req.chatId = chatId;
  next();
};

/**
 * Middleware pour valider que l'utilisateur a accès au groupe spécifié
 * Vérifie que l'utilisateur est membre du groupe
 */
export const createValidateChatAccess = (ChatGroupModel = ChatGroup) => async (req, res, next) => {
  try {
    const { chatId } = req;
    const userId = req.user?._id;
    const telegramId = req.user?.telegram?.id ? String(req.user.telegram.id) : null;
    
    if (!userId) {
      logger.warn('Requête rejetée: utilisateur non authentifié', {
        path: req.path,
        chatId
      });
      
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be authenticated to access group data'
      });
    }
    
    const memberCriteria = [{ 'members.userId': userId }];
    if (telegramId) {
      memberCriteria.push({ 'members.telegramId': telegramId });
    }

    // Vérifier que le groupe existe et que l'utilisateur en est membre
    const group = await ChatGroupModel.findOne({
      chatId,
      isActive: true,
      $or: memberCriteria
    });
    
    if (!group) {
      logger.warn('Accès au groupe refusé', {
        userId,
        telegramId,
        chatId,
        path: req.path
      });
      
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this group or the group does not exist'
      });
    }
    
    // Attacher les informations du groupe à la requête
    req.group = group;
    next();
  } catch (error) {
    logger.error('Erreur lors de la validation de l\'accès au groupe:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while validating group access'
    });
  }
};

export const validateChatAccess = createValidateChatAccess();

/**
 * Middleware optionnel pour les routes qui acceptent chatId mais ne l'exigent pas
 * Attache le chatId s'il est présent, sinon continue sans erreur
 */
export const optionalChatId = (req, res, next) => {
  const { chatId, reason } = normalizeChatId(extractChatId(req));

  if (reason === 'invalid') return rejectInvalidChatId(req, res);
  if (chatId) req.chatId = chatId;
  
  next();
};
