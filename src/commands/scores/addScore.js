import { bot } from '../../config/bot.js';
import * as scoreService from '../../api/services/scoreService.js';
import { Activity } from '../../api/models/activity.js';
import User from '../../api/models/User.js';
import logger from '../../utils/logger.js';
import { resolveUserId } from '../utils/helpers.js';

/**
 * Gère la commande /score pour ajouter un score
 * Format: /score @utilisateur activité points [commentaire]
 */
export const addScore = async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const targetUser = match[1];
  const activityName = match[2];
  const pointsStr = match[3];
  const comments = match[4] || '';
  const points = parseInt(pointsStr, 10);

  try {
    // Vérifier les paramètres
    if (!targetUser || !activityName || isNaN(points)) {
      return bot.sendMessage(
        chatId,
        '📊 *Enregistrer un score*\n\n' +
        'Format: `/score @utilisateur activité points [commentaire]`\n\n' +
        'Exemple: `/score @john course 10 Très bonne performance`',
        { parse_mode: 'Markdown' }
      );
    }

    // Afficher un message de chargement
    const loadingMsg = await bot.sendMessage(
      chatId,
      '🔄 Ajout du score en cours...',
      { parse_mode: 'Markdown' }
    );

    // Extraire l'ID utilisateur si mention
    let userIdToScore;
    let userToScore;

    if (targetUser.startsWith('@')) {
      // Rechercher l'utilisateur par nom d'utilisateur Telegram
      const username = targetUser.substring(1);
      userToScore = await User.findOne({ 'telegram.username': username });
      
      if (!userToScore) {
        return bot.editMessageText(
          `❌ Utilisateur ${targetUser} non trouvé. Assurez-vous que l'utilisateur est enregistré.`,
          {
            chat_id: chatId,
            message_id: loadingMsg.message_id
          }
        );
      }
      
      userIdToScore = userToScore._id;
    } else {
      // Considérer comme un ID Telegram ou un nom d'utilisateur
      userToScore = await User.findOne({ 'telegram.id': String(targetUser) });
      
      if (!userToScore) {
        return bot.editMessageText(
          `❌ Utilisateur "${targetUser}" non trouvé. Utilisez @nom_utilisateur.`,
          {
            chat_id: chatId,
            message_id: loadingMsg.message_id
          }
        );
      }
      
      userIdToScore = userToScore._id;
    }

    // Rechercher l'activité par nom
    const activity = await Activity.findOne({ 
      name: { $regex: new RegExp(`^${activityName}$`, 'i') },
      chatId: chatId.toString()
    });

    if (!activity) {
      return bot.editMessageText(
        `❌ Activité "${activityName}" non trouvée. Créez-la d'abord avec /createactivity.`,
        {
          chat_id: chatId,
          message_id: loadingMsg.message_id
        }
      );
    }

    // Ajouter le score via le service
    const score = await scoreService.addScore({
      type: 'individual',
      entityId: userIdToScore.toString(),
      activityId: activity._id.toString(),
      value: points,
      awardedBy: userId.toString(),
      chatId: chatId.toString(),
      messageId: msg.message_id.toString(),
      comments: comments || undefined
    });

    // Réponse de succès
    const displayName = userToScore.getDisplayName();
    
    await bot.editMessageText(
      `✅ Score ajouté avec succès !\n\n` +
      `👤 *${displayName}*\n` +
      `🏆 Activité: *${activity.name}*\n` +
      `🔢 Points: *${points}*` +
      (comments ? `\n💬 Commentaire: _${comments}_` : ''),
      {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      }
    );

    logger.info(`Score ajouté: ${points} points pour ${displayName} (${activity.name})`);

  } catch (error) {
    logger.error(`Erreur lors de l'ajout du score: ${error.message}`, { error });
    
    // Gérer les erreurs
    bot.sendMessage(
      chatId,
      `❌ Erreur lors de l'ajout du score: ${error.message}`
    );
  }
};

export default addScore;