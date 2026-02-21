import { bot } from '../config/bot.js';
import { TELEGRAM_CONFIG } from '../config/telegram.js';

// Import des utilitaires
import { handleError, validateParams } from './utils/helpers.js';
import { setupCallbackHandlers } from './utils/callbackHandler.js';

// Import des commandes par catégorie
import * as authCommands from './auth/index.js';
import * as activityCommands from './activities/index.js';
import * as teamCommands from './teams/index.js';
import * as scoreCommands from './scores/index.js';
import * as utilityCommands from './utils/index.js';
import * as webAppCommands from './utils/webAppCommands.js';
import { createActivityWithButtons } from './activities/createActivityWithButtons.js';
import logger from '../utils/logger.js';
import { createBotCommand, wrapCommandHandler } from './utils/botCommandUtils.js';

// Configuration des commandes
export const setupCommands = async () => {
  try {
    logger.info('Configuration des commandes...');
    
    // Obtenir les informations du bot pour récupérer son username
    const botInfo = await bot.getMe();
    const botUsername = botInfo.username;
    
    // 1. Commandes d'authentification
    bot.onText(createBotCommand('start'), wrapCommandHandler(authCommands.start, botUsername));
    bot.onText(createBotCommand('help'), wrapCommandHandler(utilityCommands.help, botUsername));
    logger.debug('Commandes d\'authentification configurées');

    // 2. Commandes d'activités
    bot.onText(createBotCommand('createactivity', '(?:\\s+(.+))?'), wrapCommandHandler(activityCommands.createActivity, botUsername));
    bot.onText(createBotCommand('create_activity'), wrapCommandHandler(createActivityWithButtons, botUsername));
    bot.onText(createBotCommand('addsubactivity', '(?:\\s+(\\S+)(?:\\s+(.+))?)?'), wrapCommandHandler(activityCommands.addSubActivity, botUsername));
    bot.onText(createBotCommand('activities'), wrapCommandHandler(activityCommands.listActivities, botUsername));
    bot.onText(createBotCommand('history', '(?:\\s+(\\d+))?(?:\\s+(\\S+))?'), wrapCommandHandler(activityCommands.history, botUsername));
    logger.debug('Commandes d\'activités configurées');

    // 3. Configuration des commandes de scores (y compris les commandes avancées)
    scoreCommands.setupScoreCommands(botUsername);
    logger.debug('Commandes de scores configurées');

    // 4. Commandes d'équipes
    bot.onText(createBotCommand('createteam', '(?:\\s+(\\S+)(?:\\s+(.+))?)?'), wrapCommandHandler(teamCommands.createTeam, botUsername));
    bot.onText(createBotCommand('addtoteam', '(?:\\s+(\\S+)(?:\\s+(\\S+)(?:\\s+(.+))?)?)?'), wrapCommandHandler(teamCommands.addToTeam, botUsername));
    bot.onText(createBotCommand('teamranking', '(?:\\s+(\\S+))?'), wrapCommandHandler(teamCommands.getTeamRanking, botUsername));
    logger.debug('Commandes d\'équipes configurées');

    // 5. Commandes utilitaires
    bot.onText(createBotCommand('stats', '(?:\\s+(\\S+))?'), wrapCommandHandler(utilityCommands.getStats, botUsername));
    bot.onText(createBotCommand('export', '(?:\\s+(\\S+))?'), wrapCommandHandler(utilityCommands.exportData, botUsername));
    bot.onText(createBotCommand('feedback', '(?:\\s+(\\S+)(?:\\s+(.+))?)?'), wrapCommandHandler(utilityCommands.submitFeedback, botUsername));
    bot.onText(createBotCommand('starttimer', '(?:\\s+(\\S+)(?:\\s+(\\d+))?)?'), wrapCommandHandler(utilityCommands.startTimer, botUsername));
    bot.onText(createBotCommand('stoptimer', '(?:\\s+(\\S+))?'), wrapCommandHandler(utilityCommands.stopTimer, botUsername));
    logger.debug('Commandes utilitaires configurées');
    
    // 6. Commandes Web App
    bot.onText(createBotCommand('app'), wrapCommandHandler(webAppCommands.openApp, botUsername));
    bot.onText(createBotCommand('admin'), wrapCommandHandler(webAppCommands.openAdminDashboard, botUsername));
    bot.onText(createBotCommand('scoremanager'), wrapCommandHandler(webAppCommands.openScoreManager, botUsername));
    bot.onText(createBotCommand('teamdashboard'), wrapCommandHandler(webAppCommands.openTeamDashboard, botUsername));
    bot.onText(createBotCommand('dashboard'), wrapCommandHandler(webAppCommands.openMainDashboard, botUsername));
    logger.debug('Commandes Web App configurées');
    
    // Configuration des gestionnaires de callbacks
    setupCallbackHandlers();
    logger.debug('Gestionnaires de callbacks configurés');

    // 7. Handler de commandes inconnues (doit être APRÈS toutes les commandes)
    const knownCommands = TELEGRAM_CONFIG.COMMANDS.map(c => c.command);
    // Ajouter les commandes non listées dans le menu mais qui existent
    const extraCommands = ['create_activity', 'subscore', 'subranking', 'aranking', 'shistory', 'export', 'feedback', 'starttimer', 'stoptimer', 'admin', 'scoremanager', 'teamdashboard'];
    const allKnownCommands = [...knownCommands, ...extraCommands];
    
    bot.on('message', (msg) => {
      if (!msg.text || !msg.text.startsWith('/')) return;
      
      const chatType = msg.chat.type;
      const isGroupChat = ['group', 'supergroup'].includes(chatType);
      
      // Extraire le nom de la commande
      const commandMatch = msg.text.match(/^\/(\w+)(?:@(\w+))?/);
      if (!commandMatch) return;
      
      const commandName = commandMatch[1].toLowerCase();
      const mentionedBot = commandMatch[2];
      
      // Dans les groupes, ignorer si la mention n'est pas pour ce bot
      if (isGroupChat) {
        if (!mentionedBot) return; // Pas de mention dans un groupe = ignorer silencieusement
        if (mentionedBot !== botUsername) return; // Mention d'un autre bot
      }
      
      // Vérifier si c'est une commande connue
      if (!allKnownCommands.includes(commandName)) {
        bot.sendMessage(
          msg.chat.id,
          `❓ Commande /${commandName} non reconnue.\n\nTapez /help pour voir les commandes disponibles.`
        ).catch(err => logger.error('Erreur envoi commande inconnue:', err));
      }
    });
    logger.debug('Handler de commandes inconnues configuré');

    // Gestion des erreurs globales
    bot.on('polling_error', (error) => {
      logger.error('Erreur de polling:', error);
    });

    bot.on('webhook_error', (error) => {
      logger.error('Erreur de webhook:', error);
    });

    // Gestion des erreurs non capturées
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Rejet non géré:', { reason, promise });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Exception non gérée:', error);
      // Ne pas quitter en développement pour permettre le débogage
      if (process.env.NODE_ENV === 'production') process.exit(1);
    });

    logger.info('Toutes les commandes ont été configurées avec succès');
    
  } catch (error) {
    logger.error('Erreur lors de la configuration des commandes:', error);
    throw error; // Propager pour une gestion centralisée
  }
};

// Export des utilitaires pour utilisation dans les commandes
export { bot } from '../config/bot.js';
export { handleError, validateParams } from './utils/helpers.js';