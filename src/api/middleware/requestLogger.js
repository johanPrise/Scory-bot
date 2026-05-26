import logger from '../../utils/logger.js';

const DEFAULT_SLOW_REQUEST_MS = 750;
const slowRequestThreshold = Number.parseInt(
  process.env.SLOW_REQUEST_MS || `${DEFAULT_SLOW_REQUEST_MS}`,
  10
);

/**
 * Middleware de logging des requêtes HTTP
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log à la fin de la requête
  res.on('finish', () => {
    const duration = Date.now() - start;
    const isSlowRequest = duration >= slowRequestThreshold;
    const logLevel = res.statusCode >= 400 || isSlowRequest ? 'warn' : 'debug';
    
    logger[logLevel](`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });

  next();
};

export default requestLogger;
