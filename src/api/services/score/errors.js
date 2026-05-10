import logger from '../../../utils/logger.js';

/**
 * Gestion des erreurs pour le service de scores
 */
export const handleScoreError = (error, customMessage, context = {}) => {
  const errorDetails = {
    message: error.message,
    status: error.status || 500,
    code: error.code || 'SCORE_SERVICE_ERROR',
    context,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  };

  logger.error(`${customMessage}: ${error.message}`, {
    error: errorDetails,
    context
  });

  const errorMessage = error.message ? `${customMessage}: ${error.message}` : customMessage;
  const errorToThrow = new Error(errorMessage);
  errorToThrow.status = error.status || 500;
  errorToThrow.details = errorDetails;
  throw errorToThrow;
};
