import { bot } from '../../config/bot.js';
import Score from '../../api/models/Score.js';
import { Activity } from '../../api/models/activity.js';
import User from '../../api/models/User.js';
import Team from '../../api/models/Team.js';
import logger from '../../utils/logger.js';
import { resolveUserId, handleError } from '../utils/helpers.js';

/**
 * Gère la commande /deletescore pour supprimer un score
 * Format: /deletescore activité [utilisateur]
 * Affiche les scores de l'activité et permet de choisir lequel supprimer
 */
export const deleteScore = async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const activityName = match[1];

  try {
    if (!activityName) {
      return bot.sendMessage(
        chatId,
        '🗑 *Supprimer un score*\n\n' +
        'Format: `/deletescore nom_activité`\n\n' +
        '📌 *Exemple:*\n' +
        '`/deletescore course`\n\n' +
        'Les scores de l\'activité seront listés pour que vous puissiez choisir lequel supprimer.\n\n' +
        '⚠️ Seul celui qui a attribué le score ou un admin peut le supprimer.',
        { parse_mode: 'Markdown' }
      );
    }

    // Résoudre l'ID utilisateur
    const mongoUserId = await resolveUserId(userId);
    if (!mongoUserId) {
      return bot.sendMessage(chatId, '❌ Vous devez d\'abord vous inscrire avec /start');
    }

    // Chercher l'activité — d'abord dans ce chat, sinon parmi celles créées par l'utilisateur
    let activity = await Activity.findOne({
      name: String(activityName),
      chatId: String(chatId)
    });
    if (!activity) {
      activity = await Activity.findOne({
        name: String(activityName),
        createdBy: String(mongoUserId)
      });
    }

    if (!activity) {
      return bot.sendMessage(
        chatId,
        `❌ Activité *${activityName}* introuvable.`,
        { parse_mode: 'Markdown' }
      );
    }

    // Récupérer les scores de cette activité attribués par cet utilisateur
    const scores = await Score.find({
      activity: activity._id,
      awardedBy: mongoUserId
    })
      .populate('user', 'username firstName')
      .populate('team', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    if (scores.length === 0) {
      return bot.sendMessage(
        chatId,
        `📋 Aucun score trouvé pour l'activité *${activityName}* que vous avez attribué.`,
        { parse_mode: 'Markdown' }
      );
    }

    // Créer des boutons pour chaque score
    const keyboard = scores.map(score => {
      let target = 'Inconnu';
      if (score.user) {
        target = score.user.username || score.user.firstName || 'Utilisateur';
      } else if (score.team) {
        target = score.team.name;
      }
      const subInfo = score.subActivity ? ` (${score.subActivity})` : '';
      return [{
        text: `${target}${subInfo}: ${score.value}/${score.maxPossible}`,
        callback_data: `delete_score_confirm_${score._id}`
      }];
    });

    keyboard.push([{ text: '❌ Annuler', callback_data: 'delete_score_cancel' }]);

    await bot.sendMessage(
      chatId,
      `🗑 *Supprimer un score de ${activity.name}*\n\nChoisissez le score à supprimer :`,
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      }
    );

  } catch (error) {
    handleError(chatId, error, 'commande /deletescore');
  }
};

/**
 * Gère les callbacks de confirmation de suppression de score
 */
export const handleDeleteScoreCallback = async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  try {
    if (data === 'delete_score_cancel') {
      await bot.editMessageText('🚫 Suppression annulée.', {
        chat_id: chatId,
        message_id: query.message.message_id
      });
      return bot.answerCallbackQuery(query.id);
    }

    const scoreId = data.replace('delete_score_confirm_', '');
    
    const mongoUserId = await resolveUserId(userId);
    const score = await Score.findById(scoreId);
    
    if (!score) {
      await bot.answerCallbackQuery(query.id, { text: 'Score introuvable' });
      return;
    }

    // Vérifier les permissions
    if (score.awardedBy.toString() !== mongoUserId.toString()) {
      await bot.answerCallbackQuery(query.id, { text: 'Permission refusée' });
      return;
    }

    // Mettre à jour les statistiques avant suppression
    if (score.user && score.status === 'approved') {
      const user = await User.findById(score.user);
      if (user) {
        await user.updateScore(-score.value);
      }
    }

    if (score.team && score.status === 'approved') {
      const team = await Team.findById(score.team);
      if (team) {
        await team.updateScore(-score.value);
      }
    }

    await Score.findByIdAndDelete(String(scoreId));

    await bot.editMessageText(
      '✅ Score supprimé avec succès.',
      {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown'
      }
    );

    logger.info('Score supprimé via bot', { userId, scoreId });
    await bot.answerCallbackQuery(query.id, { text: 'Score supprimé !' });

  } catch (error) {
    logger.error('Erreur suppression score:', error);
    await bot.answerCallbackQuery(query.id, { text: 'Erreur lors de la suppression' });
  }
};

export default deleteScore;
