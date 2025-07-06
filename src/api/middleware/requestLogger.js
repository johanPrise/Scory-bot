import logger from '../../utils/logger.js';

/**
 * Middleware to log incoming requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const requestLogger = (req, res, next) => {
  // Log the request method and URL
  logger.info(`${req.method} ${req.originalUrl}`);
  
  // Log request body if it exists and is not empty
  if (Object.keys(req.body).length > 0) {
    logger.debug('Request body:', req.body);
  }
  
  // Log query parameters if they exist
  if (Object.keys(req.query).length > 0) {
    logger.debug('Query parameters:', req.query);
  }
  
  // Log headers if needed (be careful with sensitive data)
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Headers:', req.headers);
  }
  
  next();
};

export default requestLogger;
