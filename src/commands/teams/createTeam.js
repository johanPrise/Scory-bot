import { bot } from '../../config/bot.js';
import * as teamService from '../../api/services/teamService.js';
import logger from '../../utils/logger.js';

/**
 * Gère la commande /createteam
 * Format: /createteam <nom_équipe> [description]
 */
export const createTeam = async (msg, match) => {
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
        'Exemple: /createteam ÉquipeA Une super équipe',
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
    const team = await teamService.createTeam(teamName, chatId.toString(), userId.toString(), {
      description: description || undefined
    });

    // Envoyer le message de confirmation
    let message = `✅ *Équipe créée avec succès !*\n\n`;
    message += `🏷 *Nom*: ${team.name}\n`;
    if (team.description) {
      message += `📝 *Description*: ${team.description}\n`;
    }
    message += `👥 *Membres*: 1 (vous)\n`;
    message += `\nUtilisez /addtoteam @utilisateur ${team.name} pour ajouter des membres à cette équipe.`;

    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: 'Markdown'
    });

    logger.info(`Équipe créée: ${team.name} par ${userId} dans le chat ${chatId}`);
  } catch (error) {
    logger.error(`Erreur lors de la création de l'équipe: ${error.message}`, { error });
    
    // Gérer les erreurs
    bot.sendMessage(
      chatId,
      `❌ Erreur lors de la création de l'équipe: ${error.message}`
    );
  }
};

export default createTeam;