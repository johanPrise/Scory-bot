import { bot } from '../../config/bot.js';
import { addScore } from '../../api/services/scoreService.js';
import logger from '../../utils/logger.js';
import { handleError } from '../utils/helpers.js';

/**
 * Gère la commande /subscore pour ajouter un sous-score
 * Format: /subscore @utilisateur activité sous_activité points
 */
export default async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const [_, targetUser, activityId, subActivity, points] = match;

  try {
    // Vérifier les paramètres
    if (!targetUser || !activityId || !subActivity || isNaN(points)) {
      return bot.sendMessage(
        chatId,
        '❌ Format incorrect. Utilisez: /subscore @utilisateur activité sous_activité points\n' +
        'Exemple: /subscore @john course 5km 10'
      );
    }

    // Extraire l'ID utilisateur si mention
    const userIdToScore = targetUser.startsWith('@') 
      ? targetUser.substring(1) 
      : targetUser;

    // Créer un ID unique pour la sous-activité
    const subActivityId = `${activityId}:${subActivity.toLowerCase()}`;

    // Ajouter le sous-score
    const score = await addScore({
      userId: userIdToScore,
      activityId: subActivityId,
      parentActivityId: activityId,
      value: parseInt(points, 10),
      addedBy: userId,
      chatId,
      metadata: {
        subActivityName: subActivity
      }
    });

    // Réponse de succès
    await bot.sendMessage(
      chatId,
      `✅ Sous-score ajouté !\n` +
      `👤 ${targetUser} : ${points} points pour ${activityId} (${subActivity})`
    );

    logger.info(`Sous-score ajouté: ${points} points pour ${targetUser} (${subActivityId})`);

  } catch (error) {
    handleError(chatId, error, 'Erreur lors de l\'ajout du sous-score');
  }
};
