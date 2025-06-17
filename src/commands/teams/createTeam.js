import { bot } from '../../config/bot.js';
import { createTeam as createTeamService } from '../../services/teamService.js';
import logger from '../../utils/logger.js';
import { handleError } from '../utils/helpers.js';

/**
 * Gère la commande /createteam
 * Format: /createteam <nom_équipe> [description]
 */
export default async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const [_, teamName, ...descriptionParts] = match;
  const description = descriptionParts.join(' ');

  try {
    // Vérifier que le nom de l'équipe est fourni
    if (!teamName) {
      return bot.sendMessage(
        chatId,
        '❌ Veuillez spécifier un nom pour l\'équipe.\n' +
        'Exemple: /createteam ÉquipeA',
        { parse_mode: 'Markdown' }
      );
    }

    // Afficher un message de chargement
    const loadingMsg = await bot.sendMessage(
      chatId,
      `🔄 Création de l'équipe *${teamName}*...`,
      { parse_mode: 'Markdown' }
    );

    // Appeler le service pour créer l'équipe
    const team = await createTeamService({
      name: teamName,
      description,
      createdBy: userId,
      chatId
    });

    // Envoyer le message de confirmation
    let message = `✅ *Équipe créée avec succès !*\n\n`;
    message += `🏷 *Nom*: ${team.name}\n`;
    if (team.description) {
      message += `📝 *Description*: ${team.description}\n`;
    }
    message += `👥 *Membres*: Aucun membre pour le moment\n`;
    message += `\nUtilisez /addtoteam pour ajouter des membres à cette équipe.`;

    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: 'Markdown'
    });

    logger.info(`Team created: ${team.name} by ${userId} in chat ${chatId}`);
  } catch (error) {
    handleError(chatId, error, `Erreur lors de la création de l'équipe '${teamName}'`);
  }
};
