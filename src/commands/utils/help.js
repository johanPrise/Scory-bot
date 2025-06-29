import { bot } from '../../config/bot.js';
import { MESSAGES, EMOJIS } from '../../config/messages.js';
import { TELEGRAM_CONFIG } from '../../config/telegram.js';

/**
 * Commande /help - Affiche l'aide et la liste des commandes disponibles
 * @param {Object} msg - L'objet message de Telegram
 */
const help = async (msg) => {
  const chatId = msg.chat.id;
  const isPrivateChat = msg.chat.type === 'private';

  // Construire le message d'aide de base
  let helpMessage = MESSAGES.HELP + '\n\n';

  // Organiser les commandes par catégories
  const commands = TELEGRAM_CONFIG.COMMANDS;
  
  // Commandes de base
  const basicCommands = commands.filter(cmd => 
    ['start', 'help', 'link'].includes(cmd.command)
  );
  
  // Commandes d'activités
  const activityCommands = commands.filter(cmd => 
    ['activities', 'activity', 'create_activity', 'join_activity'].includes(cmd.command)
  );
  
  // Commandes de scores
  const scoreCommands = commands.filter(cmd => 
    ['score', 'scores', 'ranking', 'leaderboard'].includes(cmd.command)
  );
  
  // Commandes d'équipes
  const teamCommands = commands.filter(cmd => 
    ['teams', 'create_team', 'join_team', 'team'].includes(cmd.command)
  );
  
  // Commandes utilitaires
  const utilityCommands = commands.filter(cmd => 
    ['settings', 'profile', 'notifications', 'tutorial', 'support', 'feedback'].includes(cmd.command)
  );

  // Construire le message par catégories
  if (basicCommands.length) {
    helpMessage += '*🏠 Commandes de base :*\n';
    helpMessage += basicCommands.map(cmd => `/${cmd.command} - ${cmd.description}`).join('\n') + '\n\n';
  }
  
  if (activityCommands.length) {
    helpMessage += '*🎯 Activités :*\n';
    helpMessage += activityCommands.map(cmd => `/${cmd.command} - ${cmd.description}`).join('\n') + '\n\n';
  }
  
  if (scoreCommands.length) {
    helpMessage += '*🏆 Scores & Classements :*\n';
    helpMessage += scoreCommands.map(cmd => `/${cmd.command} - ${cmd.description}`).join('\n') + '\n\n';
  }
  
  if (teamCommands.length) {
    helpMessage += '*👥 Équipes :*\n';
    helpMessage += teamCommands.map(cmd => `/${cmd.command} - ${cmd.description}`).join('\n') + '\n\n';
  }
  
  if (utilityCommands.length) {
    helpMessage += '*⚙️ Paramètres & Support :*\n';
    helpMessage += utilityCommands.map(cmd => `/${cmd.command} - ${cmd.description}`).join('\n') + '\n\n';
  }
  
  // Ajouter le nombre total de commandes
  helpMessage += `_Total : ${commands.length} commandes disponibles_`;

  // Ajouter des exemples si c'est un chat privé
  if (isPrivateChat) {
    helpMessage += '\n\n*Exemples :*\n';
    helpMessage += '• /start - Démarrer le bot\n';
    helpMessage += '• /link ABC123 - Lier votre compte avec le code ABC123\n';
    helpMessage += '• /createactivity "Tournoi d\'échecs" - Créer une nouvelle activité\n';
  }

  try {
    // Envoyer le message d'aide avec un clavier contextuel
    await bot.sendMessage(chatId, helpMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: `${EMOJIS.BOOK} Documentation`, url: 'https://docs.scory-bot.com' },
            { text: `${EMOJIS.GEAR} Paramètres`, callback_data: 'settings' }
          ],
          [
            { text: `${EMOJIS.PEOPLE} Support`, url: 'https://t.me/scory_support' }
          ]
        ]
      }
    });

    // Si c'est un chat de groupe, envoyer un message supplémentaire
    if (!isPrivateChat) {
      await bot.sendMessage(
        chatId,
        `${EMOJIS.INFO} *Astuce :* Envoyez-moi un message privé pour une assistance plus détaillée !`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (error) {
    console.error('Erreur dans la commande /help:', error);
    try {
      // En cas d'erreur avec le Markdown, essayer sans
      await bot.sendMessage(chatId, helpMessage.replace(/[\*_`\[]/g, ''));
    } catch (e) {
      console.error('Échec de l\'envoi du message d\'aide:', e);
      // Dernier recours : envoyer un message d'erreur générique
      try {
        await bot.sendMessage(chatId, MESSAGES.ERRORS.GENERAL);
      } catch (sendError) {
        console.error('Échec de l\'envoi du message d\'erreur:', sendError);
      }
    }
  }
};

export default help;
