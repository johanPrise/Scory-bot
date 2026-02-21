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

    // 3. Enregistrer les commandes dans le menu Telegram
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

main();
