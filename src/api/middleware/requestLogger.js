import logger from '../../utils/logger.js';

/**
 * Middleware de logging des requêtes HTTP
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Capturer la méthode originale de fin de réponse
  const originalSend = res.send;
  
  // Override de la méthode send pour capturer la réponse
  res.send = function(data) {
    const duration = Date.now() - start;
    const contentLength = Buffer.byteLength(data || '', 'utf8');
    
    // Log de la requête
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      contentLength: `${contentLength}B`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.userId || null,
    };

    // Niveau de log selon le status
    if (res.statusCode >= 500) {
      logger.error('HTTP Request Error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP Request Warning', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
    
    // Appeler la méthode originale
    originalSend.call(this, data);
  };
  
  next();
};

/**
 * Middleware pour logger les requêtes lentes
 */
export const slowRequestLogger = (threshold = 1000) => {
  return (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      if (duration > threshold) {
        logger.warn('Slow Request Detected', {
          method: req.method,
          url: req.originalUrl,
          duration: `${duration}ms`,
          threshold: `${threshold}ms`,
          userId: req.userId || null,
        });
      }
    });
    
    next();
  };
};