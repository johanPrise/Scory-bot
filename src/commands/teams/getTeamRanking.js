import { bot } from '../../config/bot.js';
import { getTeamRanking as getTeamRankingService } from '../../api/services/teamService.js';
import logger from '../../utils/logger.js';
import { handleError } from '../utils/helpers.js';

/**
 * Gère la commande /teamranking
 * Format: /teamranking [activité]
 */
export default async (msg, match) => {
  const chatId = msg.chat.id;
  const [_, activityName] = match;

  try {
    // Afficher un message de chargement
    const loadingMsg = await bot.sendMessage(
      chatId,
      '🔄 Récupération du classement des équipes...',
      { parse_mode: 'Markdown' }
    );

    // Appeler le service pour obtenir le classement
    const ranking = await getTeamRankingService({
      chatId,
      activityName: activityName || null
    });

    // Formater le message de réponse
    let message = '🏆 *Classement des équipes*';
    if (activityName) {
      message += ` pour l\\'activité *${activityName}*`;
    }
    message += '\\n\\n';

    if (ranking.length === 0) {
      message += 'Aucune équipe trouvée. Créez des équipes avec /createteam';
    } else {
      ranking.forEach((team, index) => {
        message += `${index + 1}. *${team.name}* - ${team.score} points\\n`;
        if (team.members && team.members.length > 0) {
          message += `   👥 ${team.members.length} membres\\n`;
        }
        if (team.lastActivity) {
          message += `   🕒 Dernière activité: ${team.lastActivity}\\n`;
        }
        message += '\\n';
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