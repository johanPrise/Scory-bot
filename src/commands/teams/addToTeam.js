import { bot } from '../../config/bot.js';
import * as teamService from '../../api/services/teamService.js';
import Team from '../../api/models/Team.js';
import User from '../../api/models/User.js';
import logger from '../../utils/logger.js';
import { resolveUserId, trackGroup } from '../utils/helpers.js';

/**
 * Gère la commande /addtoteam
 * Format: /addtoteam @utilisateur nom_équipe [admin]
 */
export const addToTeam = async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const targetUser = match[1];
  const teamName = match[2];
  const isAdmin = match[3]?.includes('admin');

  try {
    // Vérifier les paramètres
    if (!targetUser || !teamName) {
      return bot.sendMessage(
        chatId,
        '❌ Format incorrect. Utilisez:\n' +
        '`/addtoteam @utilisateur nom_équipe [admin]`\n\n' +
        'Exemples:\n' +
        '`/addtoteam @john ÉquipeA`\n' +
        '`/addtoteam @john ÉquipeA admin`',
        { parse_mode: 'Markdown' }
      );
    }

    // Afficher un message de chargement
    const loadingMsg = await bot.sendMessage(
      chatId,
      `🔄 Ajout de ${targetUser} à l'équipe "${teamName}"...`
    );

    // Extraire l'ID utilisateur si mention
    let userIdToAdd;
    let userToAdd;

    if (targetUser.startsWith('@')) {
      // Rechercher l'utilisateur par nom d'utilisateur Telegram
      const username = targetUser.substring(1);
      userToAdd = await User.findOne({ 'telegram.username': String(username) });
      
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

    // Rechercher l'équipe par nom (échapper les caractères spéciaux regex)
    const escapedTeamName = teamName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const team = await Team.findOne({ 
      name: { $regex: new RegExp(`^${escapedTeamName}$`, 'i') },
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
    const adderMongoId = await resolveUserId(userId);
    if (!adderMongoId) {
      return bot.editMessageText(
        '❌ Vous devez d\'abord vous inscrire avec /start',
        { chat_id: chatId, message_id: loadingMsg.message_id }
      );
    }

    // Tracker le groupe Telegram
    await trackGroup(msg, adderMongoId);

    const adder = await User.findById(adderMongoId);
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

    // Ajouter le membre à l'équipe via teamMemberService
    const role = isAdmin ? teamService.TEAM_ROLES.ADMIN : teamService.TEAM_ROLES.MEMBER;
    await teamService.teamMemberService.addMember({
      teamId: team._id.toString(),
      userId: userIdToAdd,
      role,
      invitedBy: adderMongoId.toString()
    });

    // Recharger l'équipe pour avoir la liste des membres à jour
    const updatedTeam = await Team.findById(team._id);

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
        const memberRole = member.isAdmin ? ' (Admin)' : '';
        message += `\n${index + 1}. ${member.username}${memberRole}`;
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