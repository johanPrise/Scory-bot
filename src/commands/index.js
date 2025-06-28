import { bot } from '../config/bot.js';

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

// Configuration des commandes
export const setupCommands = () => {
  try {
    logger.info('Configuration des commandes...');
    
    // 1. Commandes d'authentification
    bot.onText(/^\/start$/, authCommands.start);
    bot.onText(/^\/link(?:\s+(.+))?$/, authCommands.link);
    bot.onText(/^\/help$/, utilityCommands.help);
    logger.debug('Commandes d\'authentification configurées');

    // 2. Commandes d'activités
    bot.onText(/^\/createactivity\s+(.+)$/, activityCommands.createActivity);
    bot.onText(/^\/create_activity$/, createActivityWithButtons);
    bot.onText(/^\/addsubactivity\s+(\S+)\s+(.+)$/, activityCommands.addSubActivity);
    bot.onText(/^\/activities$/, activityCommands.listActivities);
    bot.onText(/^\/history$/, activityCommands.history);
    logger.debug('Commandes d\'activités configurées');

    // 3. Configuration des commandes de scores (y compris les commandes avancées)
    scoreCommands.setupScoreCommands();
    logger.debug('Commandes de scores configurées');

    // 4. Commandes d'équipes
    bot.onText(/^\/createteam\s+(\S+)\s+(.+)$/, teamCommands.createTeam);
    bot.onText(/^\/addtoteam\s+(\S+)\s+(\S+)\s+(.+)$/, teamCommands.addToTeam);
    bot.onText(/^\/teamranking\s+(\S+)$/, teamCommands.getTeamRanking);
    logger.debug('Commandes d\'équipes configurées');

    // 5. Commandes utilitaires
    bot.onText(/^\/stats\s+(\S+)$/, utilityCommands.getStats);
    bot.onText(/^\/export\s+(\S+)$/, utilityCommands.exportData);
    bot.onText(/^\/feedback\s+(\S+)\s+(.+)$/, utilityCommands.submitFeedback);
    bot.onText(/^\/starttimer\s+(\S+)\s+(\d+)$/, utilityCommands.startTimer);
    bot.onText(/^\/stoptimer\s+(\S+)$/, utilityCommands.stopTimer);
    logger.debug('Commandes utilitaires configurées');
    
    // 6. Commandes Web App
    bot.onText(/^\/admin$/, webAppCommands.openAdminDashboard);
    bot.onText(/^\/scoremanager$/, webAppCommands.openScoreManager);
    bot.onText(/^\/teamdashboard$/, webAppCommands.openTeamDashboard);
    bot.onText(/^\/dashboard$/, webAppCommands.openMainDashboard);
    logger.debug('Commandes Web App configurées');
    
    // Configuration des gestionnaires de callbacks
    setupCallbackHandlers();
    logger.debug('Gestionnaires de callbacks configurés');

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