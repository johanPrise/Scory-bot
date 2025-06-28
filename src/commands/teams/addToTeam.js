import { bot } from '../../config/bot.js';
import * as teamService from '../../services/teamService.js';
import Team from '../../models/Team.js';
import User from '../../models/User.js';
import logger from '../../utils/logger.js';

/**
 * Gère la commande /addtoteam
 * Format: /addtoteam @utilisateur nom_équipe
 */
export const addToTeam = async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const [_, targetUser, teamName, ...rest] = match;
  const isAdmin = rest.includes('admin');

  try {
    // Vérifier les paramètres
    if (!targetUser || !teamName) {
      return bot.sendMessage(
        chatId,
        '❌ Format incorrect. Utilisez: /addtoteam @utilisateur nom_équipe [admin]\n' +
        'Exemple: /addtoteam @john ÉquipeA\n' +
        'Pour ajouter comme admin: /addtoteam @john ÉquipeA admin',
        { parse_mode: 'Markdown' }
      );
    }

    // Afficher un message de chargement
    const loadingMsg = await bot.sendMessage(
      chatId,
      `🔄 Ajout de ${targetUser} à l'équipe *${teamName}*...`,
      { parse_mode: 'Markdown' }
    );

    // Extraire l'ID utilisateur si mention
    let userIdToAdd;
    let userToAdd;

    if (targetUser.startsWith('@')) {
      // Rechercher l'utilisateur par nom d'utilisateur Telegram
      const username = targetUser.substring(1);
      userToAdd = await User.findOne({ 'telegram.username': username });
      
      if (!userToAdd) {
        return bot.editMessageText(
          `❌ Utilisateur ${targetUser} non trouvé. Assurez-vous que l'utilisateur est enregistré.`,
          {
            chat_id: chatId,
            message_id: loadingMsg.message_id
          }
        );
      }
      
      userIdToAdd = userToAdd._id.toString();
    } else {
      // Considérer comme un ID direct
      userIdToAdd = targetUser;
      userToAdd = await User.findById(userIdToAdd);
      
      if (!userToAdd) {
        return bot.editMessageText(
          `❌ Utilisateur avec ID ${targetUser} non trouvé.`,
          {
            chat_id: chatId,
            message_id: loadingMsg.message_id
          }
        );
      }
    }

    // Rechercher l'équipe par nom
    const team = await Team.findOne({ 
      name: { $regex: new RegExp(`^${teamName}$`, 'i') },
      chatId: chatId.toString()
    });

    if (!team) {
      return bot.editMessageText(
        `❌ Équipe "${teamName}" non trouvée. Créez-la d'abord avec /createteam.`,
        {
          chat_id: chatId,
          message_id: loadingMsg.message_id
        }
      );
    }

    // Vérifier si l'utilisateur qui ajoute est admin ou propriétaire
    const adder = await User.findById(userId.toString());
    const isAdderAdmin = adder.isTeamAdmin(team._id);
    const isAdderOwner = adder.isTeamOwner(team._id);

    if (!isAdderAdmin && !isAdderOwner) {
      return bot.editMessageText(
        `❌ Vous n'avez pas les permissions pour ajouter des membres à cette équipe.`,
        {
          chat_id: chatId,
          message_id: loadingMsg.message_id
        }
      );
    }

    // Vérifier si l'utilisateur veut ajouter un admin alors qu'il n'est pas propriétaire
    if (isAdmin && !isAdderOwner) {
      return bot.editMessageText(
        `❌ Seul le propriétaire de l'équipe peut ajouter des administrateurs.`,
        {
          chat_id: chatId,
          message_id: loadingMsg.message_id
        }
      );
    }

    // Ajouter le membre à l'équipe
    const updatedTeam = await teamService.addMemberToTeam(team._id.toString(), userIdToAdd, {
      isAdmin: isAdmin,
      addedBy: userId.toString()
    });

    // Réponse de succès
    const displayName = userToAdd.getDisplayName();
    
    let message = `✅ Membre ajouté avec succès !\n\n`;
    message += `👥 *Équipe*: ${team.name}\n`;
    message += `👤 *Membre ajouté*: ${displayName}\n`;
    message += `🔰 *Rôle*: ${isAdmin ? 'Administrateur' : 'Membre'}\n`;
    message += `👑 *Ajouté par*: ${msg.from.first_name || msg.from.username}`;

    if (updatedTeam.members && updatedTeam.members.length > 0) {
      message += '\n\n*Membres actuels*:';
      updatedTeam.members.forEach((member, index) => {
        const role = member.isAdmin ? ' (Admin)' : '';
        message += `\n${index + 1}. ${member.username}${role}`;
      });
    }

    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: 'Markdown'
    });

    logger.info(`Utilisateur ${userIdToAdd} ajouté à l'équipe ${team.name} par ${userId} dans le chat ${chatId}`);
  } catch (error) {
    logger.error(`Erreur lors de l'ajout à l'équipe: ${error.message}`, { error });
    
    // Gérer les erreurs
    bot.sendMessage(
      chatId,
      `❌ Erreur lors de l'ajout à l'équipe: ${error.message}`
    );
  }
};

export default addToTeam;