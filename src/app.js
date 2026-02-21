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
async function main() {
  try {
    logger.info('🚀 Démarrage de Scory-bot (API + Bot)...');

    // Vérifier les variables d'environnement
    const required = ['MONGO_URL', 'JWT_SECRET', 'TELEGRAM_BOT_TOKEN'];
    const missing = required.filter(v => !process.env[v]);
    if (missing.length > 0) {
      throw new Error(`Variables manquantes: ${missing.join(', ')}`);
    }

    // 1. Démarrer l'API (connecte aussi MongoDB)
    const port = process.env.API_PORT || 3001;
    await startApiServer(port);

    // 2. Configurer les commandes du bot
    await setupCommands();
    logger.info('✅ Commandes du bot configurées');

    // 3. Configurer le webhook en production ou le polling en dev
    if (process.env.NODE_ENV === 'production' && process.env.TELEGRAM_WEBHOOK_URL) {
      // En production : configurer le webhook
      const webhookUrl = `${process.env.TELEGRAM_WEBHOOK_URL}/webhook/${process.env.TELEGRAM_BOT_TOKEN}`;
      await bot.setWebHook(webhookUrl);
      logger.info(`✅ Webhook Telegram configuré : ${process.env.TELEGRAM_WEBHOOK_URL}/webhook/***`);
    } else {
      // En dev : s'assurer qu'on ne casse pas le webhook de production
      // node-telegram-bot-api supprime le webhook automatiquement au démarrage du polling,
      // ce qui empêche la production de recevoir les updates Telegram.
      logger.warn('⚠️ Mode développement (polling) — le webhook de production sera désactivé tant que ce serveur tourne.');
      logger.warn('⚠️ Arrêtez ce serveur local pour que la production reprenne la main.');
      logger.info('✅ Bot en mode polling (développement)');
    }

    // 4. Enregistrer les commandes dans le menu Telegram
    try {
      await bot.setMyCommands(TELEGRAM_CONFIG.COMMANDS);
      logger.info('✅ Menu des commandes Telegram mis à jour');
    } catch (err) {
      logger.warn('⚠️ Impossible de mettre à jour le menu Telegram:', err.message);
    }

    logger.info('✅ Scory-bot démarré — API + Bot prêts !');

  } catch (error) {
    logger.error('❌ Erreur au démarrage:', error);
    process.exit(1);
  }
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
      await bot.setWebHook(webhookUrl);
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

main();
