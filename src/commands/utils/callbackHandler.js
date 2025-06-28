import { bot } from '../../config/bot.js';
import logger from '../../utils/logger.js';
import { handleActivityCreationCallback } from '../activities/createActivityWithButtons.js';

/**
 * Configure les gestionnaires de callbacks pour les boutons inline
 */
export const setupCallbackHandlers = () => {
  bot.on('callback_query', async (query) => {
    try {
      const action = query.data;
      const userId = query.from.id;
      const username = query.from.username || `${query.from.first_name || ''} ${query.from.last_name || ''}`.trim();
      
      logger.debug(`Callback reçu: ${action} de ${username} (${userId})`);
      
      // Gérer les différents types de callbacks
      if (action.startsWith('create_activity_type_')) {
        // Callbacks de création d'activité
        await handleActivityCreationCallback(query, action);
      } 
      else if (action.startsWith('score_')) {
        // Callbacks de gestion des scores
        // await handleScoreCallback(query, action);
        await bot.answerCallbackQuery(query.id, { text: "Fonctionnalité de score en cours de développement" });
      }
      else if (action.startsWith('team_')) {
        // Callbacks de gestion des équipes
        // await handleTeamCallback(query, action);
        await bot.answerCallbackQuery(query.id, { text: "Fonctionnalité d'équipe en cours de développement" });
      }
      else if (action.startsWith('settings_')) {
        // Callbacks de paramètres
        // await handleSettingsCallback(query, action);
        await bot.answerCallbackQuery(query.id, { text: "Fonctionnalité de paramètres en cours de développement" });
      }
      else {
        // Callback non reconnu
        logger.warn(`Callback non reconnu: ${action}`);
        await bot.answerCallbackQuery(query.id, { text: "Action non reconnue" });
      }
      
    } catch (error) {
      logger.error('Erreur lors du traitement du callback:', error);
      
      try {
        await bot.answerCallbackQuery(query.id, { 
          text: "Une erreur s'est produite. Veuillez réessayer." 
        });
      } catch (e) {
        logger.error('Erreur lors de la réponse au callback:', e);
      }
    }
  });
  
  logger.info('Gestionnaires de callbacks configurés');
};