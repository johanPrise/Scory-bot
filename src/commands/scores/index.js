// Import du bot
import { bot } from '../../config/bot.js';
import { createBotCommand, wrapCommandHandler } from '../utils/botCommandUtils.js';

// Commandes de base
import addScore from './addScore.js';
import addSubScore from './addSubScore.js';
import getRanking from './getRanking.js';
import getSubRanking from './getSubRanking.js';

// Commandes avancées
import advancedRanking from './advancedRanking.js';
import scoreHistory from './scoreHistory.js';
import dashboard, { setupDashboardHandlers } from './dashboard.js';

// Commande de suppression
import deleteScore from './deleteScore.js';
export { handleDeleteScoreCallback } from './deleteScore.js';

/**
 * Configure les gestionnaires de commandes de scores
 * @param {string} botUsername - Nom d'utilisateur du bot
 */
const setupScoreCommands = (botUsername) => {
  // Commandes de base
  bot.onText(createBotCommand('score', '(?:\\s+(\\S+)\\s+(\\S+)\\s+(\\d+)(?:\\s+(.+))?)?'), wrapCommandHandler(addScore, botUsername));
  bot.onText(createBotCommand('subscore', '(?:\\s+(\\S+)\\s+(\\S+)\\s+(\\S+)\\s+(\\d+))?'), wrapCommandHandler(addSubScore, botUsername));
  bot.onText(createBotCommand('ranking', '(?:\\s+(\\S+))?'), wrapCommandHandler(getRanking, botUsername));
  bot.onText(createBotCommand('subranking', '(?:\\s+(\\S+)(?:\\s+(.+))?)?'), wrapCommandHandler(getSubRanking, botUsername));
  
  // Commandes avancées
  bot.onText(createBotCommand('aranking', '(?:\\s+(\\S+)(?:\\s+(\\S+))?)?'), wrapCommandHandler(advancedRanking, botUsername));
  bot.onText(createBotCommand('shistory', '(?:\\s+(\\S+)(?:\\s+(\\S+))?)?'), wrapCommandHandler(scoreHistory, botUsername));
  
  // Commande de suppression
  bot.onText(createBotCommand('deletescore', '(?:\\s+(\\S+))?'), wrapCommandHandler(deleteScore, botUsername));
  
  // NOTE: /dashboard est géré dans webAppCommands (commands/index.js) pour ouvrir le Web App
  // Ne pas le ré-enregistrer ici pour éviter des réponses en double
  
  // Configurer les gestionnaires d'événements
  setupDashboardHandlers();
};

export {
  // Commandes de base
  addScore,
  addSubScore,
  getRanking,
  getSubRanking,
  
  // Commandes avancées
  advancedRanking,
  scoreHistory,
  dashboard,
  
  // Configuration
  setupScoreCommands
};
