import { bot } from '../../config/bot.js';
import Team from '../../api/models/Team.js';
import User from '../../api/models/User.js';
import logger from '../../utils/logger.js';
import { resolveUserId, handleError } from '../utils/helpers.js';

/**
 * Gère la commande /deleteteam pour supprimer une équipe
 * Format: /deleteteam nom_équipe
 */
export const deleteTeam = async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const teamName = match[1];

  try {
    if (!teamName) {
      return bot.sendMessage(
        chatId,
        '🗑 *Supprimer une équipe*\n\n' +
        'Format: `/deleteteam nom_équipe`\n\n' +
        '📌 *Exemple:*\n' +
        '`/deleteteam ÉquipeA`\n\n' +
        '⚠️ Seul le créateur de l\'équipe peut la supprimer.',
        { parse_mode: 'Markdown' }
      );
    }

    // Résoudre l'ID utilisateur
    const mongoUserId = await resolveUserId(userId);
    if (!mongoUserId) {
      return bot.sendMessage(chatId, '❌ Vous devez d\'abord vous inscrire avec /start');
    }

    // Chercher l'équipe par nom — d'abord dans ce chat, sinon parmi celles créées par l'utilisateur
    let team = await Team.findOne({
      name: String(teamName),
      chatId: String(chatId)
    });
    if (!team) {
      team = await Team.findOne({
        name: String(teamName),
        createdBy: String(mongoUserId)
      });
    }

    if (!team) {
      return bot.sendMessage(
        chatId,
        `❌ Équipe *${teamName}* introuvable.`,
        { parse_mode: 'Markdown' }
      );
    }

    // Vérifier les permissions (seul le créateur)
    if (team.createdBy.toString() !== mongoUserId.toString()) {
      return bot.sendMessage(chatId, '❌ Seul le créateur de l\'équipe peut la supprimer.');
    }

    // Demander confirmation
    await bot.sendMessage(
      chatId,
      `⚠️ Voulez-vous vraiment supprimer l'équipe *${team.name}* ?\n\n` +
      `👥 ${team.members.length} membre(s) seront retirés.\n` +
      `Cette action est irréversible.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Confirmer', callback_data: `delete_team_confirm_${team._id}` },
            { text: '❌ Annuler', callback_data: 'delete_team_cancel' }
          ]]
        }
      }
    );

    logger.info(`Demande de suppression d'équipe: ${team.name}`, { userId, teamId: team._id });

  } catch (error) {
    handleError(chatId, error, 'commande /deleteteam');
  }
};

/**
 * Gère les callbacks de confirmation de suppression d'équipe
 */
export const handleDeleteTeamCallback = async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  try {
    if (data === 'delete_team_cancel') {
      await bot.editMessageText('🚫 Suppression annulée.', {
        chat_id: chatId,
        message_id: query.message.message_id
      });
      return bot.answerCallbackQuery(query.id);
    }

    const teamId = data.replace('delete_team_confirm_', '');
    
    const mongoUserId = await resolveUserId(userId);
    const team = await Team.findById(teamId);
    
    if (!team) {
      await bot.answerCallbackQuery(query.id, { text: 'Équipe introuvable' });
      return;
    }

    // Vérifier les permissions
    if (team.createdBy.toString() !== mongoUserId.toString()) {
      await bot.answerCallbackQuery(query.id, { text: 'Permission refusée' });
      return;
    }

    // Retirer tous les membres de l'équipe
    for (const member of team.members) {
      const user = await User.findById(member.userId);
      if (user) {
        await user.removeFromTeam(team._id);
      }
    }

    await Team.findByIdAndDelete(String(teamId));

    await bot.editMessageText(
      `✅ Équipe *${team.name}* supprimée avec succès.`,
      {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown'
      }
    );

    logger.info(`Équipe supprimée: ${team.name}`, { userId, teamId });
    await bot.answerCallbackQuery(query.id, { text: 'Équipe supprimée !' });

  } catch (error) {
    logger.error('Erreur suppression équipe:', error);
    await bot.answerCallbackQuery(query.id, { text: 'Erreur lors de la suppression' });
  }
};

export default deleteTeam;
