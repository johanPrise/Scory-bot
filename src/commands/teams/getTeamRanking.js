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
    // Extraire les noms correctement (gestion des noms composés)
    const activityNameInput = match && match[1] ? match[1].trim() : null;

    try {
      // Si pas d'activité spécifiée, optionnel dans certains contextes, mais on va l'accepter vide ou non

    
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

    let activity = null;
    if (activityNameInput) {
      // Rechercher l'activité par nom (échapper les caractères spéciaux regex)
      const escapedName = String(activityNameInput).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      activity = await Activity.findOne({
        name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
        chatId: String(chatId)
      });
    }

    // Appeler le service pour obtenir le classement
    const ranking = await getTeamRankingService({
      chatId: chatId.toString(),
      activityName: activity ? activity.name : activityNameInput
    });

    // Formater le message de réponse
    let message = `🏆 *Classement global des équipes*\n\n`;
    if (activityNameInput) {
      message = `🏆 *Classement des équipes* pour *${activityNameInput}*\n\n`;
    }

    if (!ranking || ranking.length === 0) {
      message += 'Aucune équipe trouvée. Créez des équipes avec /createteam';
    } else {
      ranking.forEach((team, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        message += `${medal} *${team.name}* - ${team.score} points\n`;
        if (team.members && team.members.length > 0) {
          message += `   👥 ${team.members.length} membres\n`;
        }
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