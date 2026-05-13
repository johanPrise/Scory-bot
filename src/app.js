import dotenv from 'dotenv';
import { startApiServer } from './api/index.js';
import { setupCommands } from './commands/index.js';
import { bot } from './config/bot.js';
import { TELEGRAM_CONFIG } from './config/telegram.js';
import logger from './utils/logger.js';

// Charger les variables d'environnement
dotenv.config();

/**
 * Point d'entrée principal : API + Bot Telegram
 */
function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function getWebhookUrl() {
  return `${process.env.TELEGRAM_WEBHOOK_URL}/webhook/${process.env.TELEGRAM_BOT_TOKEN}`;
}

function getWebhookOptions() {
  return {
    allowed_updates: TELEGRAM_CONFIG.POLLING_OPTIONS.params.allowed_updates,
    secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
  };
}

function validateEnvironment() {
  const required = ['MONGO_URL', 'JWT_SECRET', 'TELEGRAM_BOT_TOKEN'];

  if (isProduction()) {
    required.push('TELEGRAM_WEBHOOK_URL', 'TELEGRAM_WEBHOOK_SECRET');
  }

  const missing = required.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Variables manquantes: ${missing.join(', ')}`);
  }
}

async function startServer() {
  await startApiServer();
}

async function configureCommands() {
  await setupCommands();
  logger.info('✅ Commandes du bot configurées');
}

async function configureProductionWebhook() {
  await bot.setWebHook(getWebhookUrl(), getWebhookOptions());
  logger.info(`✅ Webhook Telegram configuré : ${process.env.TELEGRAM_WEBHOOK_URL}/webhook/***`);
}

function logDevelopmentPollingMode() {
  // node-telegram-bot-api supprime le webhook automatiquement au démarrage du polling.
  logger.warn('⚠️ Mode développement (polling) — le webhook de production sera désactivé tant que ce serveur tourne.');
  logger.warn('⚠️ Arrêtez ce serveur local pour que la production reprenne la main.');
  logger.info('✅ Bot en mode polling (développement)');
}

async function configureTelegramUpdates() {
  if (isProduction()) {
    await configureProductionWebhook();
    return;
  }

  logDevelopmentPollingMode();
}

async function registerTelegramMenu() {
  try {
    await bot.setMyCommands(TELEGRAM_CONFIG.COMMANDS);
    logger.info('✅ Menu des commandes Telegram mis à jour');
  } catch (err) {
    logger.warn('⚠️ Impossible de mettre à jour le menu Telegram:', err.message);
  }
}

function handleStartupError(error) {
  logger.error('❌ Erreur au démarrage:', error);
  process.exit(1);
}

// Gestion des erreurs globales
process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED REJECTION:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('UNCAUGHT EXCEPTION:', error);
  process.exit(1);
});

/**
 * Restaure le webhook de production quand le serveur dev s'arrête.
 * En polling, node-telegram-bot-api supprime le webhook au démarrage.
 * Il faut le remettre en place à l'arrêt pour que la production reprenne.
 */
async function restoreWebhookOnShutdown() {
  if (process.env.NODE_ENV !== 'production' && process.env.TELEGRAM_WEBHOOK_URL) {
    try {
      const webhookUrl = `${process.env.TELEGRAM_WEBHOOK_URL}/webhook/${process.env.TELEGRAM_BOT_TOKEN}`;
      await bot.setWebHook(webhookUrl, {
        allowed_updates: TELEGRAM_CONFIG.POLLING_OPTIONS.params.allowed_updates,
        ...(process.env.TELEGRAM_WEBHOOK_SECRET && {
          secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
        }),
      });
      logger.info(`🔄 Webhook de production restauré : ${process.env.TELEGRAM_WEBHOOK_URL}/webhook/***`);
    } catch (err) {
      logger.error('❌ Impossible de restaurer le webhook:', err.message);
    }
  }
  // Arrêter le polling proprement
  try {
    await bot.stopPolling();
  } catch {}
}

process.once('SIGINT', async () => {
  logger.info('Signal SIGINT reçu. Arrêt...');
  await restoreWebhookOnShutdown();
  process.exit(0);
});

process.once('SIGTERM', async () => {
  logger.info('Signal SIGTERM reçu. Arrêt...');
  await restoreWebhookOnShutdown();
  process.exit(0);
});

try {
  logger.info('🚀 Démarrage de Scory-bot (API + Bot)...');
  validateEnvironment();
  await startServer();
  await configureCommands();
  await configureTelegramUpdates();
  await registerTelegramMenu();
  logger.info('✅ Scory-bot démarré — API + Bot prêts !');
} catch (error) {
  handleStartupError(error);
}
