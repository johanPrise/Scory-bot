import { bot } from '../../config/bot.js';
import logger from '../../utils/logger.js';
import { createInlineKeyboard, createWebAppButton, createUrlButton } from '../../utils/inlineButtons.js';
import { handleError } from './helpers.js';

const WEB_APP_BASE = process.env.WEB_APP_URL || process.env.WEBAPP_URL || 'http://localhost:3000';

/**
 * Commande /app — Ouvrir l'application Scory
 * 
 * - En PRIVÉ : bouton web_app natif (initData disponible, auth fonctionne)
 * - En GROUPE : deep-link vers le privé du bot (web_app interdit dans les groupes par Telegram)
 */
export const openApp = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name || '';
    const isPrivate = msg.chat.type === 'private';
    const isHttps = WEB_APP_BASE.startsWith('https://');

    if (isPrivate && isHttps) {
      // ===== MODE PRIVÉ : Bouton web_app natif =====
      // Telegram injecte automatiquement initData → auth transparente
      const keyboard = [
        [createWebAppButton('🚀 Ouvrir Scory App', WEB_APP_BASE)]
      ];

      const welcomeMessage =
        `🎯 <b>Scory App</b>\n\n` +
        `👋 Salut <b>${escapeHtml(firstName || 'Utilisateur')}</b> !\n\n` +
        `Clique sur le bouton ci-dessous pour ouvrir l'application complète.\n\n` +
        `<i>Tes groupes et scores sont accessibles depuis l'app.</i>`;

      await bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: 'HTML',
        ...createInlineKeyboard(keyboard)
      });

    } else {
      // ===== MODE GROUPE : Redirection vers le privé =====
      // Les boutons web_app sont interdits dans les groupes par Telegram.
      // On envoie un deep-link vers le chat privé du bot avec le paramètre "app".
      const botInfo = await bot.getMe();
      const deepLink = `https://t.me/${botInfo.username}?start=app_chat${Math.abs(chatId)}`;

      const keyboard = [
        [createUrlButton('🚀 Ouvrir Scory en privé', deepLink)]
      ];

      const message =
        `🎯 <b>Scory App</b>\n\n` +
        `📱 L'application Scory s'ouvre en message privé avec le bot pour fonctionner correctement.\n\n` +
        `👆 <b>Clique sur le bouton ci-dessous</b>, puis appuie sur <b>DÉMARRER</b> dans le chat privé.`;

      await bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        ...createInlineKeyboard(keyboard)
      });
    }

    logger.info(`/app par ${userId} dans ${msg.chat.type} (chat ${chatId})`);

  } catch (error) {
    logger.error('Erreur /app:', error);
    await handleError(msg, error, 'commande /app');
  }
};

/** Échappe les caractères spéciaux HTML */
function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}