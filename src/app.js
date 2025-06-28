import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { setupCommands } from './commands/index.js';
import { bot, setupBot } from './config/bot.js';
import { connectToDatabase } from './config/database.js';
import { TELEGRAM_CONFIG, ENV_CONFIG } from './config/telegram.js';
import logger, { logCriticalError, logUserAction } from './utils/logger.js';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Charger les variables d'environnement
dotenv.config();

// Configuration basée sur l'environnement
const env = process.env.NODE_ENV || 'development';
const config = {
  ...TELEGRAM_CONFIG,
  ...(ENV_CONFIG[env] || ENV_CONFIG.development)
};

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importer l'app Express principale (à adapter selon votre structure)
import expressApp from './api/index.js'; // Remplacez par le chemin réel de votre app Express

let io; // Pour exposer l'instance Socket.IO

/**
 * Fonction principale pour démarrer l'application
 */
async function startApp() {
  try {
    // 1. Connexion à la base de données
    logger.info('Connexion à la base de données...');
    await connectToDatabase();
    logger.info('✅ Base de données connectée avec succès');

    // 2. Configuration du bot
    logger.info('Configuration du bot...');
    await setupBot();
    
    // 3. Configuration des commandes
    logger.info('Configuration des commandes...');
    await setupCommands();
    
    // 4. Configuration des gestionnaires d'événements
    setupEventHandlers();
    
    // 5. Démarrer le bot en mode polling ou webhook selon la configuration
    if (config.polling) {
      logger.info('Démarrage du bot en mode polling...');
      // Le bot est déjà en mode polling si configuré dans les options du constructeur
      logger.info('Bot en mode polling activé');
    } else if (config.webhook) {
      logger.info('Démarrage du bot en mode webhook...');
      // Pour node-telegram-bot-api, le webhook doit être configuré différemment
      // Vous devrez utiliser bot.setWebHook() et configurer un serveur Express
      logger.warn('Mode webhook non implémenté pour node-telegram-bot-api');
    }
    
    // 6. Démarrage du serveur HTTP + Socket.IO
    const httpServer = http.createServer(expressApp);
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    // Exposer io globalement si besoin
    expressApp.set('io', io);

    const apiPort = process.env.API_PORT || 3001;
    httpServer.listen(apiPort, () => {
      logger.info(`🚀 API + Socket.IO démarrés sur le port ${apiPort}`);
    });
    
    logger.info(`🤖 Bot démarré avec succès en mode ${env.toUpperCase()}`);
    
  } catch (error) {
    const errorMsg = `Échec du démarrage de l'application: ${error.message}`;
    logCriticalError(error, { 
      context: 'Démarrage de l\'application',
      stack: error.stack 
    });
    
    // Essayer d'envoyer un message d'erreur avant de quitter
    try {
      await bot.sendMessage(
        process.env.ADMIN_CHAT_ID, 
        `❌ Erreur critique: ${error.message}\n\nStack: ${error.stack}`.substring(0, 4000)
      );
    } catch (e) {
      console.error('Impossible d\'envoyer la notification d\'erreur:', e);
    }
    
    process.exit(1);
  }
}

/**
 * Configure les gestionnaires d'événements du bot
 */
function setupEventHandlers() {
  // Gestion des erreurs de polling
  bot.on('polling_error', (error) => {
    logCriticalError(error, { context: 'Erreur de polling' });
  });
  
  // Gestion des erreurs de webhook
  bot.on('webhook_error', (error) => {
    logCriticalError(error, { context: 'Erreur de webhook' });
  });
  
  // Gestion des erreurs générales du bot
  bot.on('error', (error) => {
    logCriticalError(error, { context: 'Erreur non gérée du bot' });
  });
  
  // Log des messages entrants (pour débogage)
  if (env !== 'production') {
    bot.on('message', (msg) => {
      const { from, chat, text } = msg || {};
      const userId = from?.id;
      const userName = from?.username || `${from?.first_name || ''} ${from?.last_name || ''}`.trim();
      const chatType = chat?.type || 'unknown';
      
      logger.debug(`[${chatType}] ${userName} (${userId}): ${text || '[sans texte]'}`);
    });
  }
}

/**
 * Gestion propre de l'arrêt de l'application
 */
async function shutdown(signal) {
  logger.warn(`Signal ${signal} reçu. Arrêt en cours...`);
  
  try {
    logger.info('Arrêt du bot...');
    await bot.stopPolling();
    logger.info('✅ Bot arrêté avec succès');
    
    // Fermer les connexions à la base de données si nécessaire
    // await mongoose.connection.close();
    
    logger.info('✅ Arrêt terminé');
    process.exit(0);
  } catch (error) {
    logCriticalError(error, { context: 'Erreur lors de l\'arrêt' });
    process.exit(1);
  }
}

// Gestion des signaux d'arrêt
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  const errorMsg = 'UNHANDLED REJECTION';
  logger.error(errorMsg, { 
    reason: reason?.message || reason, 
    stack: reason?.stack,
    promise 
  });
  
  // En production, on peut notifier l'administrateur
  if (process.env.NODE_ENV === 'production') {
    bot.sendMessage(
      process.env.ADMIN_CHAT_ID, 
      `${errorMsg}: ${reason?.message || 'Aucun détail'}`
    ).catch(console.error);
  }
});

process.on('uncaughtException', (error) => {
  logCriticalError(error, { context: 'UNCAUGHT EXCEPTION' });
  
  // On laisse le processus se terminer après une erreur non capturée
  // (selon les bonnes pratiques Node.js)
  process.exit(1);
});

// Exporter l'instance io pour l'utiliser dans d'autres modules
export { io };

// Démarrer l'application
startApp();