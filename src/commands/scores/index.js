// Import du bot
import { bot } from '../../config/bot.js';

// Commandes de base
import addScore from './addScore.js';
import addSubScore from './addSubScore.js';
import getRanking from './getRanking.js';
import getSubRanking from './getSubRanking.js';

// Commandes avancées
import advancedRanking from './advancedRanking.js';
import scoreHistory from './scoreHistory.js';
import dashboard from './dashboard.js';

// Gestionnaires
import { setupDashboardHandlers } from './dashboard.js';

/**
 * Configure les gestionnaires de commandes de scores
 */
const setupScoreCommands = () => {
  // Commandes de base
  bot.onText(/^\/score\s+(\S+)\s+(\S+)\s+(\d+)$/, addScore);
  bot.onText(/^\/subscore\s+(\S+)\s+(\S+)\s+(\S+)\s+(\d+)$/, addSubScore);
  bot.onText(/^\/ranking\s+(\S+)$/, getRanking);
  bot.onText(/^\/subranking\s+(\S+)\s+(.+)$/, getSubRanking);
  
  // Commandes avancées
  bot.onText(/^\/aranking(?:\s+(\S+)(?:\s+(\S+))?)?$/, advancedRanking);
  bot.onText(/^\/shistory(?:\s+(\S+)(?:\s+(\S+))?)?$/, scoreHistory);
  bot.onText(/^\/dashboard(?:\s+(\S+))?$/, dashboard);
  
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
