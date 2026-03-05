import { bot } from '../../config/bot.js';
import { Activity } from '../../api/models/activity.js';
import Team from '../../api/models/Team.js';
import logger from '../../utils/logger.js';
import { resolveUserId, handleError, trackGroup } from '../utils/helpers.js';

/**
 * Gère la commande /deleteactivity pour supprimer une activité
 * Format: /deleteactivity nom_activité
 */
export const deleteActivity = async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const activityName = match[1];

  try {
    if (!activityName) {
      return bot.sendMessage(
        chatId,
        '🗑 *Supprimer une activité*\n\n' +
        'Format: `/deleteactivity nom_activité`\n\n' +
        '📌 *Exemple:*\n' +
        '`/deleteactivity course`\n\n' +
        '⚠️ Seul le créateur ou un admin peut supprimer une activité.',
        { parse_mode: 'Markdown' }
      );
    }

    // Résoudre l'ID utilisateur
    const mongoUserId = await resolveUserId(userId);
    if (!mongoUserId) {
      return bot.sendMessage(chatId, '❌ Vous devez d\'abord vous inscrire avec /start');
    }

    // Tracker le groupe Telegram
    await trackGroup(msg, mongoUserId);

    // Chercher l'activité par nom — d'abord dans ce chat, sinon parmi celles créées par l'utilisateur
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

    // Vérifier les permissions
    const isCreator = activity.createdBy.toString() === mongoUserId.toString();
    if (!isCreator) {
      return bot.sendMessage(chatId, '❌ Seul le créateur de l\'activité peut la supprimer.');
    }

    // Demander confirmation via callback
    await bot.sendMessage(
      chatId,
      `⚠️ Voulez-vous vraiment supprimer l'activité *${activity.name}* ?\n\n` +
      `Cette action est irréversible et supprimera aussi toutes les données associées.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ Confirmer', callback_data: `delete_activity_confirm_${activity._id}` },
            { text: '❌ Annuler', callback_data: 'delete_activity_cancel' }
          ]]
        }
      }
    );

    logger.info(`Demande de suppression d'activité: ${activity.name}`, { userId, activityId: activity._id });

  } catch (error) {
    handleError(chatId, error, 'commande /deleteactivity');
  }
};

/**
 * Gère les callbacks de confirmation de suppression d'activité
 */
export const handleDeleteActivityCallback = async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  try {
    if (data === 'delete_activity_cancel') {
      await bot.editMessageText('🚫 Suppression annulée.', {
        chat_id: chatId,
        message_id: query.message.message_id
      });
      return bot.answerCallbackQuery(query.id);
    }

    const activityId = data.replace('delete_activity_confirm_', '');
    
    const mongoUserId = await resolveUserId(userId);
    const activity = await Activity.findById(activityId);
    
    if (!activity) {
      await bot.answerCallbackQuery(query.id, { text: 'Activité introuvable' });
      return;
    }

    // Vérifier les permissions
    if (activity.createdBy.toString() !== mongoUserId.toString()) {
      await bot.answerCallbackQuery(query.id, { text: 'Permission refusée' });
      return;
    }

    // Retirer l'activité de l'équipe si applicable
    if (activity.teamId) {
      const team = await Team.findById(activity.teamId);
      if (team) {
        team.activities = team.activities.filter(actId =>
          actId.toString() !== activity._id.toString()
        );
        await team.save();
      }
    }

    await Activity.findByIdAndDelete(String(activityId));

    await bot.editMessageText(
      `✅ Activité *${activity.name}* supprimée avec succès.`,
      {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown'
      }
    );

    logger.info(`Activité supprimée: ${activity.name}`, { userId, activityId });
    await bot.answerCallbackQuery(query.id, { text: 'Activité supprimée !' });

  } catch (error) {
    logger.error('Erreur suppression activité:', error);
    await bot.answerCallbackQuery(query.id, { text: 'Erreur lors de la suppression' });
  }
};

export default deleteActivity;
