import logger from '../../utils/logger.js';

/**
 * Middleware de logging des requêtes HTTP
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log à la fin de la requête
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'debug';
    
    logger[logLevel](`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });

  next();
};

export default requestLogger;
