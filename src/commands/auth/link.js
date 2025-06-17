import { bot } from '../../config/bot.js';
import { MESSAGES, EMOJIS } from '../../config/messages.js';
import { handleError } from '../utils/helpers.js';
import { authService } from '../../services/apiService.js';

/**
 * Commande /link - Lie un compte Telegram à un compte Scory existant
 * @param {Object} msg - L'objet message de Telegram
 * @param {Array} match - Les correspondances de l'expression régulière
 */
const link = async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const args = match ? match[1] : ''; // Arguments après la commande

  if (!args) {
    return bot.sendMessage(chatId, MESSAGES.LINK.INSTRUCTIONS, {
      parse_mode: 'Markdown'
    });
  }

  try {
    // Vérifier si l'utilisateur est déjà lié
    const existingUser = await authService.getUserByTelegramId(userId).catch(() => null);
    
    if (existingUser) {
      return await bot.sendMessage(
        chatId,
        `✅ Votre compte Telegram est déjà lié à ${existingUser.email || 'votre compte'}.`,
        { parse_mode: 'Markdown' }
      );
    }
    
    // Lier le compte Telegram
    const userData = await authService.linkTelegramAccount(userId, args);
    
    // Envoyer un message de confirmation
    await bot.sendMessage(chatId, MESSAGES.LINK.SUCCESS, {
      parse_mode: 'Markdown'
    });
    
    // Envoyer les informations de l'utilisateur
    await bot.sendMessage(
      chatId,
      `👤 *Informations du compte*\n` +
      `• Nom: ${userData.name || 'Non défini'}\n` +
      `• Email: ${userData.email || 'Non défini'}\n` +
      `• Rôle: ${userData.role || 'Utilisateur'}`,
      { parse_mode: 'Markdown' }
    );
    
    // Mettre à jour le clavier avec les options principales
    const menuOptions = [
      [{ text: '📊 Voir activités' }, { text: '👥 Mes groupes' }],
      [{ text: '🏆 Classements' }, { text: '⚙️ Paramètres' }]
    ];
    
    // Ajouter des options supplémentaires pour les administrateurs
    if (userData.role === 'admin' || userData.role === 'creator') {
      menuOptions.push([{ text: '👑 Administration' }]);
    }
    
    await bot.sendMessage(chatId, 'Que souhaitez-vous faire maintenant ?', {
      reply_markup: {
        keyboard: menuOptions,
        resize_keyboard: true,
        one_time_keyboard: false
      }
    });
  } catch (error) {
    console.error('Erreur dans la commande /link:', error);
    
    // Message d'erreur personnalisé en fonction du type d'erreur
    let errorMessage = MESSAGES.LINK.ERROR;
    
    if (error.message.includes('invalide') || error.message.includes('invalide')) {
      errorMessage = '❌ Code de liaison invalide. Veuillez vérifier le code et réessayer.';
    } else if (error.message.includes('expiré')) {
      errorMessage = '⌛ Ce code de liaison a expiré. Veuillez en générer un nouveau depuis le site web.';
    } else if (error.message.includes('déjà utilisé')) {
      errorMessage = '⚠️ Ce code de liaison a déjà été utilisé. Si ce n\'est pas vous, veuillez contacter le support.';
    }
    
    try {
      // Envoyer le message d'erreur
      await bot.sendMessage(chatId, errorMessage, {
        parse_mode: 'Markdown'
      });
      
      // Proposer de réessayer avec un clavier inline
      await bot.sendMessage(chatId, 'Souhaitez-vous réessayer ?', {
        reply_markup: {
          inline_keyboard: [
            [
              { text: `${EMOJIS.REFRESH} Réessayer`, callback_data: 'retry_link' },
              { text: `${EMOJIS.HELP} Aide`, url: 'https://docs.scory-bot.com/guide' }
            ]
          ]
        }
      });
    } catch (sendError) {
      console.error('Échec de l\'envoi du message d\'erreur:', sendError);
      
      // Dernier recours : message d'erreur simple
      try {
        await bot.sendMessage(chatId, 'Une erreur est survenue. Veuillez réessayer plus tard.');
      } catch (e) {
        console.error('Échec critique de l\'envoi du message:', e);
      }
    }
  }
};

export default link;
