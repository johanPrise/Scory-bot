import ChatGroup from '../models/ChatGroup.js';
import logger from '../../utils/logger.js';

/**
 * Middleware pour exiger la présence d'un chatId dans les requêtes
 * Rejette les requêtes sans chatId avec une erreur 400
 */
export const requireChatId = (req, res, next) => {
  // Extraire le chatId depuis différentes sources possibles
  const chatId = req.query.chatId || 
                 req.body.chatId || 
                 req.body.metadata?.chatId ||
                 req.params.chatId;
  
  if (!chatId) {
    logger.warn('Requête rejetée: chatId manquant', {
      path: req.path,
      method: req.method,
      userId: req.user?._id
    });
    
    return res.status(400).json({
      error: 'chatId is required',
      message: 'All operations must be scoped to a specific Telegram group. Please provide a chatId parameter.'
    });
  }
  
  // Attacher le chatId à la requête pour utilisation ultérieure
  req.chatId = chatId.toString();
  next();
};

/**
 * Middleware pour valider que l'utilisateur a accès au groupe spécifié
 * Vérifie que l'utilisateur est membre du groupe
 */
export const validateChatAccess = async (req, res, next) => {
  try {
    const { chatId } = req;
    const userId = req.user?._id;
    
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
    
    // Vérifier que le groupe existe et que l'utilisateur en est membre
    const group = await ChatGroup.findOne({
      chatId,
      'members.userId': userId,
      isActive: true
    });
    
    if (!group) {
      logger.warn('Accès au groupe refusé', {
        userId,
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

/**
 * Middleware optionnel pour les routes qui acceptent chatId mais ne l'exigent pas
 * Attache le chatId s'il est présent, sinon continue sans erreur
 */
export const optionalChatId = (req, res, next) => {
  const chatId = req.query.chatId || 
                 req.body.chatId || 
                 req.body.metadata?.chatId ||
                 req.params.chatId;
  
  if (chatId) {
    req.chatId = chatId.toString();
  }
  
  next();
};
