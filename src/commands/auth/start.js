/**
 * Commande /start - Auto-crée ou retrouve l'utilisateur
 */
import { bot } from '../../config/bot.js';
import User from '../../api/models/User.js';
import ChatGroup from '../../api/models/ChatGroup.js';
import logger from '../../utils/logger.js';

const start = async (msg) => {
  const chatId = msg.chat.id;
  const from = msg.from;

  try {
    // Chercher ou créer l'utilisateur par son ID Telegram
    let user = await User.findOne({ 'telegram.id': String(from.id) });

    if (!user) {
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

    const webAppUrl = process.env.WEB_APP_URL;
    const hasValidWebApp = webAppUrl && webAppUrl.startsWith('https://');

    const options = { parse_mode: 'Markdown' };
    if (hasValidWebApp) {
      options.reply_markup = {
        inline_keyboard: [
          [{ text: '🚀 Ouvrir Scory App', web_app: { url: webAppUrl } }]
        ]
      };
    }

    const welcomeText = [
      `🎯 *Bienvenue sur Scory, ${from.first_name || 'Joueur'} !*`,
      '',
      user.wasNew !== false ? '✅ Votre profil a été créé automatiquement.' : '',
      '',
      '📋 *Commandes principales :*',
      '/help — Liste des commandes',
      '/activities — Voir les activités',
      '/ranking — Voir le classement',
      '/score — Enregistrer un score',
      '/createteam — Créer une équipe',
      hasValidWebApp ? '\n🚀 Ou cliquez le bouton ci-dessous !' : ''
    ].filter(Boolean).join('\n');

    await bot.sendMessage(chatId, welcomeText, options);

  } catch (error) {
    logger.error('Erreur /start:', error);
    await bot.sendMessage(chatId, '❌ Une erreur est survenue. Réessayez avec /start').catch(() => {});
  }
};

export default start;
