#!/usr/bin/env node

/**
 * Script de configuration des Web Apps Telegram
 * Phase 1 : Finaliser l'Intégration
 */

import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import logger from '../src/utils/logger.js';

// Charger les variables d'environnement
dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

/**
 * Configuration des Web Apps Telegram
 */
class TelegramWebAppConfigurator {
  constructor() {
    this.webAppUrl = process.env.WEB_APP_URL || 'http://localhost:3000';
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!this.botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN est requis');
    }
  }

  /**
   * Configure les commandes du bot avec les Web Apps
   */
  async configureBotCommands() {
    try {
      const commands = [
        {
          command: 'start',
          description: '🚀 Démarrer le bot'
        },
        {
          command: 'dashboard',
          description: '📈 Ouvrir le tableau de bord principal'
        },
        {
          command: 'admin',
          description: '🖥️ Panneau d\'administration (admin uniquement)'
        },
        {
          command: 'scoremanager',
          description: '📊 Gestionnaire de scores'
        },
        {
          command: 'teamdashboard',
          description: '👥 Tableau de bord des équipes'
        },
        {
          command: 'help',
          description: '❓ Aide et documentation'
        }
      ];

      await bot.setMyCommands(commands);
      logger.info('✅ Commandes du bot configurées avec succès');
      
      return commands;
    } catch (error) {
      logger.error('❌ Erreur lors de la configuration des commandes:', error);
      throw error;
    }
  }

  /**
   * Teste la connectivité du bot
   */
  async testBotConnection() {
    try {
      const me = await bot.getMe();
      logger.info(`✅ Bot connecté: @${me.username} (${me.first_name})`);
      return me;
    } catch (error) {
      logger.error('❌ Erreur de connexion au bot:', error);
      throw error;
    }
  }

  /**
   * Valide la configuration des Web Apps
   */
  validateWebAppConfig() {
    const requiredEnvVars = [
      'TELEGRAM_BOT_TOKEN',
      'WEB_APP_URL',
      'API_BASE_URL',
      'MONGO_URL'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Variables d'environnement manquantes: ${missingVars.join(', ')}`);
    }

    logger.info('✅ Configuration des Web Apps validée');
    return true;
  }

  /**
   * Génère un message de test pour les Web Apps
   */
  generateTestMessage(userId) {
    const webAppButtons = [
      [
        {
          text: "📈 Dashboard Principal",
          web_app: { url: `${this.webAppUrl}/dashboard?userId=${userId}` }
        }
      ],
      [
        {
          text: "📊 Gestion des Scores",
          web_app: { url: `${this.webAppUrl}/scores?userId=${userId}` }
        }
      ],
      [
        {
          text: "👥 Équipes",
          web_app: { url: `${this.webAppUrl}/teams?userId=${userId}` }
        }
      ]
    ];

    return {
      text: `🚀 *Test des Web Apps Telegram*\n\n` +
            `Cliquez sur les boutons ci-dessous pour tester l'intégration:\n\n` +
            `• Dashboard Principal - Vue d'ensemble\n` +
            `• Gestion des Scores - Créer et modifier\n` +
            `• Équipes - Gérer les équipes\n\n` +
            `_Configuration Web App URL: ${this.webAppUrl}_`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: webAppButtons
      }
    };
  }

  /**
   * Envoie un message de test à un utilisateur
   */
  async sendTestMessage(chatId) {
    try {
      const message = this.generateTestMessage(chatId);
      await bot.sendMessage(chatId, message.text, {
        parse_mode: message.parse_mode,
        reply_markup: message.reply_markup
      });
      
      logger.info(`✅ Message de test envoyé au chat ${chatId}`);
      return true;
    } catch (error) {
      logger.error(`❌ Erreur lors de l'envoi du message de test:`, error);
      throw error;
    }
  }

  /**
   * Configuration complète des Web Apps
   */
  async configure() {
    try {
      logger.info('🔧 Début de la configuration des Web Apps Telegram...');
      
      // 1. Valider la configuration
      this.validateWebAppConfig();
      
      // 2. Tester la connexion du bot
      const botInfo = await this.testBotConnection();
      
      // 3. Configurer les commandes
      const commands = await this.configureBotCommands();
      
      // 4. Résumé de la configuration
      const summary = {
        bot: {
          username: botInfo.username,
          name: botInfo.first_name,
          id: botInfo.id
        },
        webApp: {
          url: this.webAppUrl,
          apiUrl: process.env.API_BASE_URL
        },
        commands: commands.length,
        environment: process.env.NODE_ENV || 'development'
      };
      
      logger.info('✅ Configuration des Web Apps terminée avec succès');
      logger.info('📋 Résumé de la configuration:', summary);
      
      return summary;
      
    } catch (error) {
      logger.error('❌ Échec de la configuration des Web Apps:', error);
      throw error;
    }
  }
}

/**
 * Fonction principale
 */
async function main() {
  try {
    const configurator = new TelegramWebAppConfigurator();
    
    // Configuration des Web Apps
    const result = await configurator.configure();
    
    console.log('\n🎉 Configuration terminée avec succès!');
    console.log('\n📋 Résumé:');
    console.log(`   Bot: @${result.bot.username} (${result.bot.name})`);
    console.log(`   Web App URL: ${result.webApp.url}`);
    console.log(`   API URL: ${result.webApp.apiUrl}`);
    console.log(`   Commandes configurées: ${result.commands}`);
    console.log(`   Environnement: ${result.environment}`);
    
    console.log('\n🚀 Prochaines étapes:');
    console.log('   1. Démarrer le serveur API: npm run dev:api');
    console.log('   2. Démarrer le serveur web: cd web && npm start');
    console.log('   3. Démarrer le bot: npm run dev:bot');
    console.log('   4. Tester avec: node scripts/test-integration.js');
    
    // Test optionnel si un chat ID est fourni
    const testChatId = process.argv[2];
    if (testChatId) {
      console.log(`\n🧪 Envoi d'un message de test au chat ${testChatId}...`);
      await configurator.sendTestMessage(testChatId);
      console.log('✅ Message de test envoyé!');
    }
    
  } catch (error) {
    console.error('\n❌ Erreur lors de la configuration:', error.message);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { TelegramWebAppConfigurator };