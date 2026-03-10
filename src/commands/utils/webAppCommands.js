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
    
    // Créer le clavier avec bouton Web App principal UNIQUEMENT (Option A)
    const keyboard = [
      [createSmartButton("🚀 Ouvrir Scory App", webAppUrl, msg)]
    ];
    
    const safeFirstName = firstName.replace(/_/g, '\\_');
    const safeUsername = username.replace(/_/g, '\\_');
    
    // Message d'accueil style Hamster Kombat
    const welcomeMessage = `🎯 *Scory Bot - L'App Complète*\n\n` +
      `👋 Salut ${safeFirstName || safeUsername || 'Utilisateur'} !\n\n` +
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