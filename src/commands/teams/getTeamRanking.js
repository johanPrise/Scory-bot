import { bot } from '../../config/bot.js';
import { getTeamRanking as getTeamRankingService } from '../../api/services/teamService.js';
import { Activity } from '../../api/models/activity.js';
import logger from '../../utils/logger.js';
import { handleError, resolveUserId, trackGroup } from '../utils/helpers.js';

/**
 * Gère la commande /teamranking
 * Format: /teamranking [activité]
 */
export default async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const activityNameInput = match[1];

  try {
    // Si pas d'activité spécifiée, afficher l'aide
    if (!activityNameInput) {
      return bot.sendMessage(
        chatId,
        '🏅 *Classement des équipes*\n\n' +
        'Utilisez: `/teamranking nom_activité`\n\n' +
        'Exemple: `/teamranking course`\n\n' +
        'Pour voir les activités disponibles: /activities',
        { parse_mode: 'Markdown' }
      );
    }

    // Afficher un message de chargement
    const loadingMsg = await bot.sendMessage(
      chatId,
      '🔄 Récupération du classement des équipes...',
      { parse_mode: 'Markdown' }
    );

    // Résoudre l'ID utilisateur et tracker le groupe
    const mongoUserId = await resolveUserId(userId);
    if (mongoUserId) {
      await trackGroup(msg, mongoUserId);
    }

    // Rechercher l'activité par nom (échapper les caractères spéciaux regex)
    const escapedName = activityNameInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const activity = await Activity.findOne({
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
      chatId: chatId.toString()
    });

    // Appeler le service pour obtenir le classement
    const ranking = await getTeamRankingService({
      chatId: chatId.toString(),
      activityName: activity ? activity.name : activityNameInput
    });

    // Formater le message de réponse
    let message = `🏆 *Classement des équipes* pour *${activityNameInput}*\n\n`;

    if (!ranking || ranking.length === 0) {
      message += 'Aucune équipe trouvée. Créez des équipes avec /createteam';
    } else {
      ranking.forEach((team, index) => {
        message += `${index + 1}. *${team.name}* - ${team.score} points\n`;
        if (team.members && team.members.length > 0) {
          message += `   👥 ${team.members.length} membres\n`;
        }
        if (team.lastActivity) {
          message += `   🕒 Dernière activité: ${team.lastActivity}\n`;
        }
        message += '\n';
      });
    }

    await bot.editMessageText(message, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: 'Markdown'
    });

    logger.info(`Team ranking displayed for chat ${chatId}`);
  } catch (error) {
    handleError(chatId, error, 'Erreur lors de la récupération du classement');
  }
};