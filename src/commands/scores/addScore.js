import { bot } from '../../config/bot.js';
import { addScore } from '../../services/scoreService.js';
import logger from '../../utils/logger.js';
import { handleError } from './utils/helpers.js';

/**
 * Gère la commande /score pour ajouter un score
 * Format: /score @utilisateur activité points
 */
export default async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const [_, targetUser, activityId, points] = match;

  try {
    // Vérifier les paramètres
    if (!targetUser || !activityId || isNaN(points)) {
      return bot.sendMessage(
        chatId,
        '❌ Format incorrect. Utilisez: /score @utilisateur activité points\n' +
        'Exemple: /score @john course 10'
      );
    }

    // Extraire l'ID utilisateur si mention
    const userIdToScore = targetUser.startsWith('@') 
      ? targetUser.substring(1) 
      : targetUser;

    // Ajouter le score
    const score = await addScore({
      userId: userIdToScore,
      activityId,
      value: parseInt(points, 10),
      addedBy: userId,
      chatId
    });

    // Réponse de succès
    await bot.sendMessage(
      chatId,
      `✅ Score ajouté !\n` +
      `👤 ${targetUser} : ${points} points pour ${activityId}`
    );

    logger.info(`Score ajouté: ${points} points pour ${targetUser} (${activityId})`);

  } catch (error) {
    handleError(chatId, error, 'Erreur lors de l\'ajout du score');
  }
};
