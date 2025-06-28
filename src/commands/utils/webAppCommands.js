import { bot } from '../../config/bot.js';
import logger from '../../utils/logger.js';
import { createInlineKeyboard, createWebAppButton } from '../../utils/inlineButtons.js';
import { handleError } from './helpers.js';

/**
 * Commande pour ouvrir le dashboard administrateur
 */
export const openAdminDashboard = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // Vérifier si l'utilisateur est un administrateur
    // (à implémenter selon votre logique d'authentification)
    
    const webAppUrl = `${process.env.WEB_APP_URL}/admin?userId=${userId}`;
    
    const keyboard = [
      [createWebAppButton("🖥️ Ouvrir le Dashboard Admin", webAppUrl)]
    ];
    
    await bot.sendMessage(
      chatId, 
      "🔐 *Dashboard Administrateur*\n\nAccédez au dashboard pour gérer les utilisateurs, les activités et les scores.", 
      {
        parse_mode: 'Markdown',
        ...createInlineKeyboard(keyboard)
      }
    );
    
    logger.info(`Utilisateur ${userId} a ouvert le dashboard admin dans le chat ${chatId}`);
    
  } catch (error) {
    logger.error('Erreur lors de l\'ouverture du dashboard admin:', error);
    await handleError(msg, error, "Une erreur s'est produite. Veuillez réessayer.");
  }
};

/**
 * Commande pour ouvrir l'interface de gestion des scores
 */
export const openScoreManager = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    const webAppUrl = `${process.env.WEB_APP_URL}/scores?userId=${userId}`;
    
    const keyboard = [
      [createWebAppButton("📊 Gestion des Scores", webAppUrl)]
    ];
    
    await bot.sendMessage(
      chatId, 
      "📊 *Gestion des Scores*\n\nAccédez à l'interface de gestion des scores pour ajouter, modifier ou visualiser les scores.", 
      {
        parse_mode: 'Markdown',
        ...createInlineKeyboard(keyboard)
      }
    );
    
    logger.info(`Utilisateur ${userId} a ouvert le gestionnaire de scores dans le chat ${chatId}`);
    
  } catch (error) {
    logger.error('Erreur lors de l\'ouverture du gestionnaire de scores:', error);
    await handleError(msg, error, "Une erreur s'est produite. Veuillez réessayer.");
  }
};

/**
 * Commande pour ouvrir le tableau de bord des équipes
 */
export const openTeamDashboard = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    const webAppUrl = `${process.env.WEB_APP_URL}/teams?userId=${userId}`;
    
    const keyboard = [
      [createWebAppButton("👥 Tableau de Bord des Équipes", webAppUrl)]
    ];
    
    await bot.sendMessage(
      chatId, 
      "👥 *Tableau de Bord des Équipes*\n\nGérez vos équipes, consultez les membres et les performances.", 
      {
        parse_mode: 'Markdown',
        ...createInlineKeyboard(keyboard)
      }
    );
    
    logger.info(`Utilisateur ${userId} a ouvert le tableau de bord des équipes dans le chat ${chatId}`);
    
  } catch (error) {
    logger.error('Erreur lors de l\'ouverture du tableau de bord des équipes:', error);
    await handleError(msg, error, "Une erreur s'est produite. Veuillez réessayer.");
  }
};

/**
 * Commande pour ouvrir le tableau de bord principal
 */
export const openMainDashboard = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    const webAppUrl = `${process.env.WEB_APP_URL}/dashboard?userId=${userId}`;
    
    const keyboard = [
      [createWebAppButton("📈 Tableau de Bord", webAppUrl)]
    ];
    
    await bot.sendMessage(
      chatId, 
      "📈 *Tableau de Bord Principal*\n\nConsultez vos statistiques, activités récentes et performances.", 
      {
        parse_mode: 'Markdown',
        ...createInlineKeyboard(keyboard)
      }
    );
    
    logger.info(`Utilisateur ${userId} a ouvert le tableau de bord principal dans le chat ${chatId}`);
    
  } catch (error) {
    logger.error('Erreur lors de l\'ouverture du tableau de bord principal:', error);
    await handleError(msg, error, "Une erreur s'est produite. Veuillez réessayer.");
  }
};