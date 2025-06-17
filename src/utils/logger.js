import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Niveaux de log personnalisés
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  telegram: 5
};

// Couleurs pour la console
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
  telegram: 'cyan'
};

// Créer le format des logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Configuration des transports (fichiers et console)
const transports = [
  // Fichier d'erreurs
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/error.log'),
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),
  
  // Fichier de logs généraux
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/combined.log'),
    maxsize: 10485760, // 10MB
    maxFiles: 5
  }),
  
  // Fichier de logs pour les interactions Telegram
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/telegram.log'),
    level: 'telegram',
    maxsize: 10485760, // 10MB
    maxFiles: 5
  })
];

// En production, on ne log que les erreurs dans la console
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf(
          (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
        )
      ),
      level: 'debug'
    })
  );
}

// Créer le logger
const logger = winston.createLogger({
  level: 'info',
  levels,
  format,
  defaultMeta: { service: 'scory-bot' },
  transports,
  exitOnError: false
});

// Ajouter les couleurs pour la console
winston.addColors(colors);

// Fonction pour formater les logs des commandes Telegram
export function logTelegramCommand(command, from, chat, args = '') {
  const chatType = chat.type === 'private' ? 'private' : `${chat.type}/${chat.title || chat.id}`;
  const userId = from.id;
  const userName = from.username ? `@${from.username}` : `${from.first_name || ''} ${from.last_name || ''}`.trim();
  
  logger.telegram(`[${chatType}] ${userName} (${userId}): /${command} ${args}`.trim());
}

// Fonction pour logger les erreurs de commandes
export function logCommandError(command, error, metadata = {}) {
  logger.error(`[${command}] ${error.message}`, {
    ...metadata,
    stack: error.stack
  });
}

// Fonction pour logger les interactions utilisateur
export function logUserAction(userId, action, metadata = {}) {
  logger.info(`[USER_ACTION] ${action}`, {
    userId,
    ...metadata
  });
}

// Fonction pour logger les erreurs critiques
export function logCriticalError(error, context = {}) {
  logger.error(`[CRITICAL] ${error.message}`, {
    ...context,
    stack: error.stack
  });
  
  // En production, on peut ajouter une notification (email, Slack, etc.)
  if (process.env.NODE_ENV === 'production') {
    // TODO: Implémenter la notification d'erreur critique
  }
}

export default logger;
