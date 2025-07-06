import winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

// Simple colored log format: "2025-07-06T09:00:00Z [info] message {meta}"
const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}] ${message}${metaString}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: combine(colorize(), timestamp(), logFormat),
  transports: [new winston.transports.Console()]
});

/**
 * Enregistre une erreur critique et ajoute le stack trace dans les meta.
 * @param {Error|string} error
 * @param {Object} [meta]
 */
export function logCriticalError(error, meta = {}) {
  logger.error(`CRITICAL: ${error?.message || error}`, { ...meta, stack: error?.stack });
}

/**
 * Log une action utilisateur (utile pour l'audit ou l'analytics).
 * @param {string|number} userId
 * @param {string} action
 * @param {Object} [meta]
 */
export function logUserAction(userId, action, meta = {}) {
  logger.info(`USER_ACTION - ${userId}: ${action}`, meta);
}

export default logger;
