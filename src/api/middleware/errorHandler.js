import logger from '../../utils/logger.js';

/**
 * Wrapper pour gérer les exceptions asynchrones dans les route handlers.
 * @param {Function} fn - le route handler async
 * @returns {Function}
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Crée une erreur Http standardisée
 * @param {number} status
 * @param {string} message
 */
export function createError(status = 500, message = 'Erreur interne du serveur') {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Middleware Express pour la gestion centralisée des erreurs.
 * Doit être monté APRÈS toutes les routes.
 */
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const payload = {
    error: err.message || 'Erreur inconnue',
  };

  // Log détaillé en dev – plus minimal en prod
  if (process.env.NODE_ENV !== 'production') {
    payload.stack = err.stack;
    logger.error(`[${status}] ${err.message}`, { stack: err.stack, path: req.originalUrl });
  } else {
    logger.error(`[${status}] ${err.message}`, { path: req.originalUrl });
  }

  res.status(status).json(payload);
}
