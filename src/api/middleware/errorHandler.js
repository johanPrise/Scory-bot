import logger from '../../utils/logger.js';

/**
 * Middleware de gestion centralisée des erreurs
 */
export const errorHandler = (err, req, res, next) => {
  // Log de l'erreur
  logger.error('API Error:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Erreurs de validation Mongoose
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Erreur de validation',
      details: errors,
    });
  }

  // Erreurs de cast Mongoose (ID invalide)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'ID invalide',
      details: `L'ID fourni n'est pas valide: ${err.value}`,
    });
  }

  // Erreurs de duplication MongoDB
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      error: 'Conflit de données',
      details: `${field} existe déjà: ${err.keyValue[field]}`,
    });
  }

  // Erreurs JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token invalide',
      details: 'Le token d\'authentification est invalide',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expiré',
      details: 'Le token d\'authentification a expiré',
    });
  }

  // Erreurs personnalisées avec status
  if (err.status) {
    return res.status(err.status).json({
      error: err.message,
      details: err.details || null,
    });
  }

  // Erreur générique
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(500).json({
    error: 'Erreur interne du serveur',
    details: isDevelopment ? err.message : 'Une erreur inattendue s\'est produite',
    stack: isDevelopment ? err.stack : undefined,
  });
};

/**
 * Wrapper pour les fonctions async des routes
 * Capture automatiquement les erreurs et les passe au middleware d'erreur
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Crée une erreur personnalisée avec un status HTTP
 */
export const createError = (status, message, details = null) => {
  const error = new Error(message);
  error.status = status;
  error.details = details;
  return error;
};