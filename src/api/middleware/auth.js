import { createError } from './errorHandler.js';
import logger from '../../utils/logger.js';
import { authenticateJwt, authenticateTelegram } from './authenticate.js';
export { requireRole } from './rolePermissions.js';
export { requireTeamPermission } from './teamPermissions.js';

const JWT_ERROR_NAMES = new Set(['JsonWebTokenError', 'TokenExpiredError']);

const resolveAuthenticatedUser = async (authorizationHeader, telegramInitData) => {
  let jwtError = null;

  try {
    const jwtUser = await authenticateJwt(authorizationHeader);
    if (jwtUser) return jwtUser;
  } catch (error) {
    if (!JWT_ERROR_NAMES.has(error.name) || !telegramInitData) throw error;
    jwtError = error;
  }

  const telegramUser = await authenticateTelegram(telegramInitData);
  if (telegramUser) return telegramUser;

  if (jwtError) throw jwtError;
  return null;
};

/**
 * Middleware d'authentification JWT (avec fallback Telegram initData)
 */
export const authMiddleware = async (req, res, next) => {
  try {
    const user = await resolveAuthenticatedUser(
      req.headers.authorization,
      req.headers['x-telegram-init-data']
    );

    if (!user) throw createError(401, 'Token d\'authentification manquant ou invalide');

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') return next(createError(401, 'Token invalide'));
    if (error.name === 'TokenExpiredError') return next(createError(401, 'Token expiré'));
    next(error);
  }
};

/**
 * Middleware optionnel d'authentification
 * N'échoue pas si pas de token, mais ajoute l'utilisateur si token valide
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const user = await authenticateJwt(req.headers.authorization);
    if (user) {
      req.user = user;
      req.userId = user._id;
    }
    next();
  } catch (error) {
    logger.warn('Erreur lors de l\'authentification optionnelle:', error.message);
    next();
  }
};
