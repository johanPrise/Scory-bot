import logger from '../../utils/logger.js';

/**
 * Crée une erreur HTTP avec un code de statut
 */
export const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.status = statusCode;
  return error;
};

/**
 * Wrapper pour les handlers async Express
 * Capture automatiquement les erreurs et les passe à next()
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware de gestion d'erreurs Express
 * Doit être le dernier middleware enregistré
 */
export const errorHandler = (err, req, res, next) => {
  // Log de l'erreur
  const statusCode = err.statusCode || err.status || 500;
  
  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.originalUrl} - ${statusCode}: ${err.message}`, {
      stack: err.stack,
      body: req.body,
      params: req.params,
      query: req.query
    });
  } else {
    logger.warn(`[${req.method}] ${req.originalUrl} - ${statusCode}: ${err.message}`);
  }

  // Réponse d'erreur
  res.status(statusCode).json({
    error: {
      message: err.message || 'Erreur interne du serveur',
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        details: err.details 
      })
    }
  });
};

export default errorHandler;
