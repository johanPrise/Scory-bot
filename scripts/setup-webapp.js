#!/usr/bin/env node

import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const token = process.env.TELEGRAM_BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL || 'http://localhost:3000/telegram';

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN manquant');
  process.exit(1);
}

const bot = new TelegramBot(token);

async function setupWebApp() {
  try {
    console.log('🔧 Configuration de la Telegram Web App...');
    
    // Vérifier les informations du bot
    const botInfo = await bot.getMe();
    console.log(`🤖 Bot: @${botInfo.username}`);
    
    // Configurer les commandes avec Web App
    const commands = [
      { command: 'start', description: '🚀 Démarrer le bot' },
      { command: 'help', description: '❓ Afficher l\'aide' },
      { command: 'app', description: '📱 Ouvrir l\'application' },
      { command: 'link', description: '🔗 Lier ton compte' },
      { command: 'createactivity', description: '➕ Créer une activité' },
      { command: 'score', description: '📊 Ajouter un score' },
      { command: 'ranking', description: '🏆 Voir le classement' },
      { command: 'activities', description: '📋 Lister les activités' }
    ];
    
    await bot.setMyCommands(commands);
    console.log('✅ Commandes configurées');
    
    // Configurer le menu principal avec Web App
    const menuButton = {
      type: 'web_app',
      text: '🚀 Ouvrir l\'App',
      web_app: {
        url: webAppUrl
      }
    };
    
    await bot.setChatMenuButton({ menu_button: menuButton });
    console.log('✅ Menu button configuré');
    
    console.log('\n🎉 Telegram Web App configurée avec succès !');
    console.log(`📱 URL de l'app: ${webAppUrl}`);
    console.log('\n💡 Les utilisateurs verront maintenant :');
    console.log('   - Un bouton "🚀 Ouvrir l\'App" dans le menu');
    console.log('   - Les commandes traditionnelles dans /help');
    
  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error.message);
    process.exit(1);
  }
}

setupWebApp();