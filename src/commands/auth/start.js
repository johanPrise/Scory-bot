/**
 * Commande /start - Auto-crée ou retrouve l'utilisateur
 * Gère aussi le deep-link /start app_chatXXX (redirection depuis /app en groupe)
 */
import { bot } from '../../config/bot.js';
import User from '../../api/models/User.js';
import ChatGroup from '../../api/models/ChatGroup.js';
import logger from '../../utils/logger.js';
import { createInlineKeyboard, createWebAppButton } from '../../utils/inlineButtons.js';

const WEB_APP_BASE = process.env.WEB_APP_URL || process.env.WEBAPP_URL || 'http://localhost:3000';

const start = async (msg, match) => {
  const chatId = msg.chat.id;
  const from = msg.from;

  try {
    // Chercher ou créer l'utilisateur par son ID Telegram
    let user = await User.findOne({ 'telegram.id': String(from.id) });

    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      // Créer le profil automatiquement
      user = await User.create({
        username: from.username || `user_${from.id}`,
        firstName: from.first_name || '',
        lastName: from.last_name || '',
        telegram: {
          id: String(from.id),
          username: from.username || '',
          chatId: String(chatId),
          linked: true
        },
        status: 'active'
      });
      logger.info(`Nouvel utilisateur créé: ${from.id} (${from.first_name})`);
    } else {
      // Mettre à jour les infos si besoin
      user.telegram.chatId = String(chatId);
      if (from.username) user.telegram.username = from.username;
      if (from.first_name) user.firstName = from.first_name;
      if (from.last_name) user.lastName = from.last_name;
      await user.save();
    }

    // Tracker le groupe Telegram si c'est un groupe
    if (msg.chat.type !== 'private') {
      try {
        await ChatGroup.upsertGroup(
          { chatId: chatId, title: msg.chat.title || `Groupe ${chatId}`, type: msg.chat.type },
          { mongoUserId: user._id, telegramId: from.id }
        );
      } catch (trackErr) {
        logger.error('Erreur tracking groupe dans /start:', trackErr.message);
      }
    }

    // ===== DEEP-LINK depuis /app en groupe : /start app_chatXXX =====
    const startParam = match?.[1]?.trim();
    if (startParam && startParam.startsWith('app_chat') && msg.chat.type === 'private') {
      const groupChatId = startParam.replace('app_chat', '-');
      const hasWebApp = WEB_APP_BASE.startsWith('https://');

      if (hasWebApp) {
        const keyboard = [
          [createWebAppButton('🚀 Ouvrir Scory App', WEB_APP_BASE)]
        ];

        const message =
          `🎯 <b>Scory App</b>\n\n` +
          `👋 Salut <b>${escapeHtml(from.first_name || 'Utilisateur')}</b> !\n\n` +
          `Clique ci-dessous pour ouvrir l'app.\n` +
          `<i>Tu pourras choisir ton groupe directement dans l'interface.</i>`;

        await bot.sendMessage(chatId, message, {
          parse_mode: 'HTML',
          ...createInlineKeyboard(keyboard)
        });

        logger.info(`Deep-link /app par ${from.id} depuis le groupe ${groupChatId}`);
        return;
      }
    }

    // ===== FLOW NORMAL : /start classique =====
    const webAppUrl = WEB_APP_BASE;
    const hasValidWebApp = webAppUrl && webAppUrl.startsWith('https://');
    const isPrivate = msg.chat.type === 'private';

    const options = { parse_mode: 'HTML' };
    if (hasValidWebApp && isPrivate) {
      options.reply_markup = {
        inline_keyboard: [
          [{ text: '🚀 Ouvrir Scory App', web_app: { url: webAppUrl } }]
        ]
      };
    }

    const welcomeText = [
      `🎯 <b>Bienvenue sur Scory, ${escapeHtml(from.first_name || 'Joueur')} !</b>`,
      '',
      isNewUser ? '✅ Votre profil a été créé automatiquement.' : '',
      '',
      '<b>📋 Commandes principales :</b>',
      '/help — Liste des commandes',
      '/activities — Voir les activités',
      '/ranking — Voir le classement',
      '/score — Enregistrer un score',
      '/createteam — Créer une équipe',
      hasValidWebApp && isPrivate ? '\n🚀 Ou cliquez le bouton ci-dessous !' : ''
    ].filter(Boolean).join('\n');

    await bot.sendMessage(chatId, welcomeText, options);

  } catch (error) {
    logger.error('Erreur /start:', error);
    await bot.sendMessage(chatId, '❌ Une erreur est survenue. Réessayez avec /start').catch(() => {});
  }
};

/** Échappe les caractères spéciaux HTML */
function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default start;
