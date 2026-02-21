import { bot } from '../../config/bot.js';
import { addScore } from '../../api/services/scoreService.js';
import { Activity } from '../../api/models/activity.js';
import User from '../../api/models/User.js';
import logger from '../../utils/logger.js';
import { handleError, resolveUserId } from '../utils/helpers.js';

/**
 * Gère la commande /subscore pour ajouter un sous-score
 * Format: /subscore @utilisateur activité sous_activité points
 */
export default async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const targetUser = match[1];
  const activityName = match[2];
  const subActivity = match[3];
  const pointsStr = match[4];
  const points = parseInt(pointsStr, 10);

  try {
    // Vérifier les paramètres
    if (!targetUser || !activityName || !subActivity || isNaN(points)) {
      return bot.sendMessage(
        chatId,
        '📊 *Ajouter un sous-score*\n\n' +
        'Format: `/subscore @utilisateur activité sous_activité points`\n\n' +
        'Exemple: `/subscore @john course 5km 10`',
        { parse_mode: 'Markdown' }
      );
    }

    // Rechercher l'utilisateur cible
    let userToScore;
    if (targetUser.startsWith('@')) {
      const username = targetUser.substring(1);
      userToScore = await User.findOne({ 'telegram.username': String(username) });
    } else {
      userToScore = await User.findOne({ 'telegram.id': String(targetUser) });
    }
    
    if (!userToScore) {
      return bot.sendMessage(chatId, `❌ Utilisateur ${targetUser} non trouvé.`);
    }

    // Rechercher l'activité par nom (échapper les caractères spéciaux regex)
    const escapedName = activityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const activity = await Activity.findOne({
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
      chatId: chatId.toString()
    });
    
    if (!activity) {
      return bot.sendMessage(chatId, `❌ Activité "${activityName}" non trouvée.`);
    }

    // Résoudre l'ID MongoDB de l'utilisateur qui attribue le score
    const awardedByMongoId = await resolveUserId(userId);
    if (!awardedByMongoId) {
      return bot.sendMessage(chatId, '❌ Vous devez d\'abord vous inscrire avec /start');
    }

    // Ajouter le sous-score
    await addScore({
      type: 'sub_activity',
      entityId: userToScore._id.toString(),
      activityId: activity._id.toString(),
      subActivityId: `${activity._id}:${subActivity.toLowerCase()}`,
      value: points,
      awardedBy: awardedByMongoId.toString(),
      chatId: chatId.toString(),
    });

    // Réponse de succès
    await bot.sendMessage(
      chatId,
      `✅ Sous-score ajouté !\n` +
      `👤 ${targetUser} : ${points} points pour ${activityName} (${subActivity})`
    );

    logger.info(`Sous-score ajouté: ${points} points pour ${targetUser} (${subActivity})`);

  } catch (error) {
    handleError(chatId, error, 'Erreur lors de l\'ajout du sous-score');
  }
};
