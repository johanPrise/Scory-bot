import dotenv from 'dotenv';
import { startApiServer } from './src/api/index.js';
import { setupCommands } from './src/commands/index.js';
import { bot } from './src/config/bot.js';
import { TELEGRAM_CONFIG } from './src/config/telegram.js';
import logger from './src/utils/logger.js';

// Charger les variables d'environnement
dotenv.config();

/**
 * Point d'entrée principal pour le serveur API
 */
function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function validateRequiredEnv() {
  const requiredEnvVars = ['MONGO_URL', 'JWT_SECRET'];
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingEnvVars.length > 0) {
    throw new Error(`Variables d'environnement manquantes: ${missingEnvVars.join(', ')}`);
  }
}

function warnMissingRecommendedEnv() {
  const recommendedEnvVars = ['TELEGRAM_BOT_TOKEN'];
  const missingRecommended = recommendedEnvVars.filter(varName => !process.env[varName]);
  if (!process.env.API_PORT && !process.env.PORT) {
    missingRecommended.push('API_PORT or PORT');
  }

  if (missingRecommended.length > 0) {
    logger.warn(`Variables d'environnement recommandées manquantes: ${missingRecommended.join(', ')}`);
  }
}

function validateProductionWebhookEnv() {
  if (!isProduction()) return;

  const requiredWebhookVars = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_URL', 'TELEGRAM_WEBHOOK_SECRET'];
  const missingWebhookVars = requiredWebhookVars.filter(varName => !process.env[varName]);

  if (missingWebhookVars.length > 0) {
    throw new Error(`Variables webhook Telegram manquantes: ${missingWebhookVars.join(', ')}`);
  }
}

function validateEnvironment() {
  validateRequiredEnv();
  warnMissingRecommendedEnv();
  validateProductionWebhookEnv();
}

async function startServer() {
  await startApiServer();
}

async function configureCommandsIfEnabled() {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;

  await setupCommands();
  logger.info('✅ Commandes du bot configurées');
}

async function configureWebhookIfEnabled() {
  if (!isProduction()) return;

  const webhookUrl = `${process.env.TELEGRAM_WEBHOOK_URL}/webhook/${process.env.TELEGRAM_BOT_TOKEN}`;
  await bot.setWebHook(webhookUrl, {
    allowed_updates: TELEGRAM_CONFIG.POLLING_OPTIONS.params.allowed_updates,
    secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
  });
  logger.info(`✅ Webhook Telegram configuré : ${process.env.TELEGRAM_WEBHOOK_URL}/webhook/***`);
}

function handleStartupError(error) {
  logger.error('❌ Erreur lors du démarrage du serveur API:', error);
  process.exit(1);
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  logger.error('UNHANDLED REJECTION:', { reason, promise });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('UNCAUGHT EXCEPTION:', error);
  process.exit(1);
});

try {
  logger.info('🚀 Démarrage du serveur API Scory-bot...');
  validateEnvironment();
  await startServer();
  await configureCommandsIfEnabled();
  await configureWebhookIfEnabled();
  logger.info('✅ Serveur API démarré avec succès');
} catch (error) {
  handleStartupError(error);
}
