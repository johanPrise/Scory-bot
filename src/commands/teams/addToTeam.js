import { bot } from '../../config/bot.js';
import { addMemberToTeam } from '../../services/teamService.js';
import logger from '../../utils/logger.js';
import { handleError, extractMentionedUser } from '../utils/helpers.js';

/**
 * Gère la commande /addtoteam
 * Format: /addtoteam <nom_équipe> @utilisateur
 */
export default async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const [_, teamName, ...rest] = match;
  const userMention = rest.join(' ').trim();
  
  try {
    // Vérifier que le nom de l'équipe est fourni
    if (!teamName) {
      return bot.sendMessage(
        chatId,
        '❌ Veuillez spécifier un nom d\'équipe.\n' +
        'Exemple: /addtoteam ÉquipeA @utilisateur',
        { parse_mode: 'Markdown' }
      );
    }

    // Vérifier qu'un utilisateur est mentionné
    const mentionedUser = extractMentionedUser(userMention);
    if (!mentionedUser) {
      return bot.sendMessage(
        chatId,
        '❌ Veuillez mentionner un utilisateur à ajouter.\n' +
        'Exemple: /addtoteam ÉquipeA @utilisateur',
        { parse_mode: 'Markdown' }
      );
    }

    // Afficher un message de chargement
    const loadingMsg = await bot.sendMessage(
      chatId,
      `🔄 Ajout de ${userMention} à l'équipe *${teamName}*...`,
      { parse_mode: 'Markdown' }
    );

    // Appeler le service pour ajouter le membre
    const result = await addMemberToTeam({
      teamName,
      userId: mentionedUser.id,
      username: mentionedUser.username,
      addedBy: userId,
      chatId
    });

    // Envoyer le message de confirmation
    let message = `✅ *Membre ajouté avec succès !*\n\n`;
    message += `👥 *Équipe*: ${result.team.name}\n`;
    message += `👤 *Membre ajouté*: ${userMention}\n`;
    message += `👑 *Ajouté par*: ${msg.from.first_name}`;

    if (result.team.members && result.team.members.length > 0) {
      message += '\n\n*Membres actuels*:';
      result.team.members.forEach((member, index) => {
        message += `\n${index + 1}. ${member.username || `Utilisateur ${member.userId}`}`;
      });
    }

    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: 'Markdown'
    });

    logger.info(`User ${mentionedUser.id} added to team ${teamName} by ${userId} in chat ${chatId}`);
  } catch (error) {
    handleError(chatId, error, `Erreur lors de l'ajout à l'équipe '${teamName}'`);
  }
};
