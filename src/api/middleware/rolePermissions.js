import { createError } from './errorHandler.js';

/**
 * Middleware de vérification des rôles
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError(401, 'Authentification requise'));
    }

    if (!roles.includes(req.user.role)) {
      return next(createError(403, 'Permissions insuffisantes'));
    }

    next();
  };
};
