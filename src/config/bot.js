import TelegramBot from 'node-telegram-bot-api';
import { SocksProxyAgent } from 'socks-proxy-agent';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TELEGRAM_CONFIG, ENV_CONFIG } from './telegram.js';
import { logCriticalError, logUserAction } from '../utils/logger.js';


// Charger les variables d'environnement
dotenv.config();

// Configuration basée sur l'environnement
const env = process.env.NODE_ENV || 'development';
const config = {
  ...TELEGRAM_CONFIG,
  ...(ENV_CONFIG[env] || ENV_CONFIG.development)
};

// Vérifier le token du bot
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  const errorMsg = '❌ ERREUR: TELEGRAM_BOT_TOKEN est manquant dans les variables d\'environnement';
  console.error(errorMsg);
  logCriticalError(new Error(errorMsg), { context: 'Initialisation du bot' });
  process.exit(1);
}

// Configuration du bot
const botOptions = {
  polling: config.polling ? {
    interval: config.POLLING_OPTIONS.interval,
    params: config.POLLING_OPTIONS.params
  } : false,
  onlyFirstMatch: true,
  request: {
    proxy: process.env.HTTP_PROXY || null,
    agentClass: process.env.HTTP_PROXY ? SocksProxyAgent : null,
    agentOptions: process.env.HTTP_PROXY ? {
      socksHost: process.env.PROXY_HOST || 'localhost',
      socksPort: parseInt(process.env.PROXY_PORT) || 1080
    } : null
  }
};

// Créer l'instance du bot
export const bot = new TelegramBot(token, botOptions);

// Gérer les erreurs de polling (conflits 409)
bot.on('polling_error', (error) => {
  if (error.code === 'ETELEGRAM' && error.response?.statusCode === 409) {
    console.error('❌ Conflit de polling détecté (409):', error.message);
    console.log('💡 Arrêtez toutes les instances du bot et redémarrez après quelques secondes');
  } else {
    console.error('❌ Erreur de polling:', error.message);
  }
});

// Configuration des commandes du bot
export const BOT_COMMANDS = config.COMMANDS;

/**
 * Configure le bot avec les commandes et les paramètres
 * @returns {Promise<Object>} Informations sur le bot
 */
export async function setupBot() {
  try {
    // Vérifier la connexion à l'API Telegram
    const botInfo = await bot.getMe();
    
    // Purger TOUTES les anciennes commandes pour tous les scopes
    // Cela supprime le cache de commandes obsolètes côté Telegram
    await bot.deleteMyCommands(); // scope par défaut (default)
    await bot.deleteMyCommands({ scope: { type: 'all_private_chats' } });
    await bot.deleteMyCommands({ scope: { type: 'all_group_chats' } });
    await bot.deleteMyCommands({ scope: { type: 'all_chat_administrators' } });
    console.log('🧹 Anciennes commandes supprimées de Telegram');
    
    // Définir les nouvelles commandes du bot
    await bot.setMyCommands(BOT_COMMANDS);
    
    // Enregistrer les commandes dans un fichier pour référence
    await saveCommandsToFile(botInfo.username);
    
    // Configurer le menu des commandes pour les chats privés
    await bot.setMyCommands(BOT_COMMANDS, { scope: { type: 'all_private_chats' } });
    
    // Afficher les informations de démarrage
    const startTime = new Date().toISOString();
    const botName = `${botInfo.first_name}${botInfo.last_name ? ' ' + botInfo.last_name : ''}`;
    
    console.log('\n' + '='.repeat(60));
    console.log(`🤖 Bot démarré: @${botInfo.username}`);
    console.log(`🆔 ID: ${botInfo.id}`);
    console.log(`👤 Nom: ${botName}`);
    console.log(`🌍 Mode: ${env.toUpperCase()}`);
    console.log(`⏰ Démarrage: ${startTime}`);
    console.log('='.repeat(60) + '\n');
    
    // Logger le démarrage du bot
    logUserAction('system', 'Bot démarré', {
      botId: botInfo.id,
      botUsername: botInfo.username,
      botName,
      env,
      startTime
    });
    
    return botInfo;
  } catch (error) {
    const errorMsg = `Échec de la configuration du bot: ${error.message}`;
    console.error(`❌ ERREUR: ${errorMsg}`);
    
    logCriticalError(error, {
      context: 'Configuration du bot',
      response: error.response?.data,
      stack: error.stack
    });
    
    if (error.response) {
      console.error('Détails de l\'erreur:', error.response.body);
    }
    
    process.exit(1);
  }
}

/**
 * Récupère la liste des commandes configurées
 * @returns {Array} Liste des commandes
 */
export function getCommands() {
  return BOT_COMMANDS;
}

/**
 * Sauvegarde les commandes dans un fichier JSON pour référence
 * @param {string} [botUsername] - Le nom d'utilisateur du bot (optionnel, pour éviter un appel API)
 * @returns {Promise<void>}
 */
export async function saveCommandsToFile(botUsername = null) {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const commandsDir = path.join(__dirname, '..', 'logs');
    const commandsPath = path.join(commandsDir, 'commands.json');
    
    // Créer le répertoire s'il n'existe pas
    if (!fs.existsSync(commandsDir)) {
      fs.mkdirSync(commandsDir, { recursive: true });
    }
    
    const commandsData = {
      lastUpdated: new Date().toISOString(),
      environment: env,
      bot: botUsername || (await bot.getMe()).username,
      commands: BOT_COMMANDS.map(cmd => ({
        command: cmd.command.replace(/^\//, ''),
        description: cmd.description,
        usage: `/${cmd.command} ${getCommandUsage(cmd.command)}`.trim()
      }))
    };
    
    // Vérifier si le fichier existe déjà et s'il est identique
    let shouldSave = true;
    if (fs.existsSync(commandsPath)) {
      try {
        const existingData = JSON.parse(await fs.promises.readFile(commandsPath, 'utf8'));
        // Comparer sans la date de mise à jour
        const { lastUpdated: _, ...existingCommands } = existingData;
        const { lastUpdated: __, ...newCommands } = commandsData;
        
        if (JSON.stringify(existingCommands) === JSON.stringify(newCommands)) {
          shouldSave = false;
        }
      } catch (error) {
        // Si erreur de lecture, on sauvegarde
        shouldSave = true;
      }
    }
    
    if (shouldSave) {
      await fs.promises.writeFile(commandsPath, JSON.stringify(commandsData, null, 2));
      console.log(`📝 Commandes sauvegardées dans ${commandsPath}`);
    } else {
      console.log(`📝 Les commandes sont à jour dans ${commandsPath}`);
    }
  } catch (error) {
    console.error('❌ ERREUR: Échec de la sauvegarde des commandes:', error.message);
  }
}

/**
 * Génère un exemple d'utilisation pour une commande
 * @param {string} command - La commande
 * @returns {string} Exemple d'utilisation
 */
function getCommandUsage(command) {
  const usages = {
    start: '',
    help: '[commande]',
    link: '<code>',
    createactivity: '<nom>',
    addsubactivity: '<id_activité> <nom>',
    score: '<id_activité> <participant> <points>',
    ranking: '<id_activité>',
    activities: ''
  };
  
  const cmd = command.replace(/^\//, '');
  return usages[cmd] || '';
}



// Note: le handler /start est enregistré dans src/commands/index.js
// via src/commands/auth/start.js (auto-crée l'utilisateur)