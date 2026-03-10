import { bot } from '../../config/bot.js';
import logger from '../../utils/logger.js';
import { createInlineKeyboard, createWebAppButton, createUrlButton } from '../../utils/inlineButtons.js';
import { handleError } from './helpers.js';

const WEB_APP_BASE = process.env.WEB_APP_URL || process.env.WEBAPP_URL || 'http://localhost:3000';

/**
 * Crée un bouton adapté selon le contexte du chat
 * - En privé + HTTPS : bouton web_app (ouverture in-app native)
 * - En groupe ou HTTP : bouton URL classique (web_app interdit dans les groupes par Telegram)
 */
const createSmartButton = (text, url, msg) => {
  const isPrivate = msg?.chat?.type === 'private';
  if (isPrivate && url?.startsWith('https://')) {
    return createWebAppButton(text, url);
  }
  // En groupe ou en dev (HTTP), utiliser un bouton URL classique
  return createUrlButton(text, url);
};

/**
 * Commande pour ouvrir le dashboard administrateur
 */
export const openAdminDashboard = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // Vérifier si l'utilisateur est un administrateur
    // (à implémenter selon votre logique d'authentification)
    
    const webAppUrl = `${WEB_APP_BASE}/approval?userId=${userId}&chatId=${chatId}`;
    
    const keyboard = [
      [createSmartButton("🖥️ Ouvrir le Dashboard Admin", webAppUrl, msg)]
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
    await handleError(msg, error, 'commande /admin');
  }
};

/**
 * Commande pour ouvrir l'interface de gestion des scores
 */
export const openScoreManager = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    const webAppUrl = `${WEB_APP_BASE}/add-score?userId=${userId}&chatId=${chatId}`;
    
    const keyboard = [
      [createSmartButton("📊 Gestion des Scores", webAppUrl, msg)]
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
    await handleError(msg, error, 'commande /scoremanager');
  }
};

/**
 * Commande pour ouvrir le tableau de bord des équipes
 */
export const openTeamDashboard = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    const webAppUrl = `${WEB_APP_BASE}/teams?userId=${userId}&chatId=${chatId}`;
    
    const keyboard = [
      [createSmartButton("👥 Tableau de Bord des Équipes", webAppUrl, msg)]
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
    await handleError(msg, error, 'commande /teamdashboard');
  }
};

/**
 * Commande pour ouvrir le tableau de bord principal
 */
export const openMainDashboard = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    const webAppUrl = `${WEB_APP_BASE}/?userId=${userId}&chatId=${chatId}`;
    
    const keyboard = [
      [createSmartButton("📈 Tableau de Bord", webAppUrl, msg)]
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
    await handleError(msg, error, 'commande /dashboard');
  }
};

/**
 * Commande principale pour ouvrir l'application (comme Hamster Kombat)
 */
export const openApp = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name || '';
    const username = msg.from.username || '';
    
    // URL de l'application avec paramètres Telegram
    const webAppUrl = `${WEB_APP_BASE}?` + new URLSearchParams({
      telegram_id: userId,
      first_name: firstName,
      username: username,
      source: 'telegram_bot',
      chat_id: chatId
    }).toString();
    
    // Créer le clavier avec bouton Web App principal + options rapides
    const keyboard = [
      [createSmartButton("🚀 Ouvrir Scory App", webAppUrl, msg)],
      [
        createSmartButton("📊 Scores", `${WEB_APP_BASE}/add-score?userId=${userId}&chatId=${chatId}`, msg),
        createSmartButton("🏆 Rankings", `${WEB_APP_BASE}/rankings?userId=${userId}&chatId=${chatId}`, msg)
      ],
      [
        createSmartButton("👥 Équipes", `${WEB_APP_BASE}/teams?userId=${userId}&chatId=${chatId}`, msg),
        createSmartButton("📈 Stats", `${WEB_APP_BASE}/rankings?userId=${userId}&chatId=${chatId}`, msg)
      ]
    ];
    
    // Message d'accueil style Hamster Kombat
    const welcomeMessage = `🎯 *Scory Bot - L'App Complète*\n\n` +
      `👋 Salut ${firstName || username || 'Utilisateur'} !\n\n` +
      `🚀 Clique sur le bouton ci-dessous pour ouvrir l'application complète de Scory directement dans Telegram !\n\n` +
      `💡 *Deux façons d'utiliser Scory :*\n` +
      `• 🤖 *Mode Bot* : Commandes rapides (/score, /ranking, etc.)\n` +
      `• 📱 *Mode App* : Interface complète avec toutes les fonctionnalités\n\n` +
      `✨ *Fonctionnalités disponibles dans l'app :*\n` +
      `• Gestion avancée des scores\n` +
      `• Tableaux de bord interactifs\n` +
      `• Gestion d'équipes\n` +
      `• Statistiques détaillées\n` +
      `• Interface intuitive\n\n` +
      `👆 *Clique sur "🚀 Ouvrir Scory App" pour commencer !*`;
    
    await bot.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'Markdown',
      ...createInlineKeyboard(keyboard)
    });
    
    logger.info(`Utilisateur ${userId} a ouvert l'application principale dans le chat ${chatId}`);
    
  } catch (error) {
    logger.error('Erreur lors de l\'ouverture de l\'application:', error);
    await handleError(msg, error, 'commande /app');
  }
};