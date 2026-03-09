import { bot } from '../../config/bot.js';
import { MESSAGES } from '../../config/messages.js';
import logger from '../../utils/logger.js';
import { getScoreHistory } from '../../api/services/scoreService.js';
import { resolveUserId, trackGroup } from '../utils/helpers.js';

/**
 * Affiche l'historique des scores d'un utilisateur
 * @param {Object} ctx - Contexte du message
 * @param {Array} match - Résultats de la correspondance d'expression régulière
 */
const scoreHistory = async (ctx, match) => {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const [_, period = 'month', activityId] = match || [];

  try {
    // Afficher un message de chargement
    const loadingMsg = await bot.sendMessage(chatId, '🔄 Chargement de l\'historique...');

    // Résoudre l'ID Telegram en ObjectId MongoDB
    const { resolveUserId } = await import('../utils/helpers.js');
    const mongoUserId = await resolveUserId(userId);

    if (!mongoUserId) {
      return bot.editMessageText(
        '❌ Vous devez d\'abord vous inscrire avec /start',
        { chat_id: chatId, message_id: loadingMsg.message_id }
      );
    }

    // Tracker le groupe Telegram
    await trackGroup(ctx, mongoUserId);

    // Récupérer l'historique des scores
    const historyResult = await getScoreHistory({
      userId: mongoUserId,
      activityId,
      limit: 10
    });

    // Le service retourne { scores, total, hasMore }
    const historyData = historyResult?.scores || [];

    // Formater et envoyer l'historique
    const formattedHistory = formatHistory(historyData, period);
    
    await bot.editMessageText(formattedHistory, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });

    // Envoyer les options de filtre
    await sendFilterOptions(chatId, userId);

  } catch (error) {
    logger.error('Erreur dans scoreHistory:', error);
    await bot.sendMessage(
      chatId,
      '❌ Une erreur est survenue lors de la récupération de l\'historique.'
    );
  }
};

/**
 * Formate les données d'historique en message Markdown
 * @param {Array} historyData - Documents Score peuplés
 * @param {string} period - Période de l'historique
 * @returns {string} Message formaté
 */
function formatHistory(historyData, period) {
  if (!historyData || historyData.length === 0) {
    return 'Aucun historique de score disponible pour cette période.';
  }

  const periodLabel = getPeriodLabel(period);
  let message = `📊 *Historique des scores ${periodLabel}*\n\n`;
  let totalScore = 0;
  let activityCount = 0;

  historyData.forEach((entry, index) => {
    const date = new Date(entry.createdAt || entry.timestamp).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const activityName = entry.activity?.name || 'Activité inconnue';
    
    message += `📅 *${date}*\n`;
    message += `🏷️ Activité: *${activityName}*\n`;
    message += `🎯 Score: *${entry.value} pts*\n`;
    
    if (entry.metadata?.comments) {
      message += `💬 Commentaire: ${entry.metadata.comments}\n`;
    }
    
    message += '\n';
    
    totalScore += entry.value || 0;
    activityCount++;
  });

  // Ajouter un résumé
  message += `\n📈 *Résumé*\n`;
  message += `• Nombre d'activités: *${activityCount}*\n`;
  message += `• Score total: *${totalScore} pts*\n`;
  message += `• Moyenne: *${activityCount > 0 ? (totalScore / activityCount).toFixed(1) : 0} pts/activité*`;

  return message;
}

/**
 * Envoie les options de filtre pour l'historique
 * @param {number} chatId - ID du chat
 * @param {number} userId - ID de l'utilisateur
 */
async function sendFilterOptions(chatId, userId) {
  await bot.sendMessage(
    chatId,
    'Filtrer l\'historique :',
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📅 7 derniers jours', callback_data: `history_week_${userId}` },
            { text: '📆 30 derniers jours', callback_data: `history_month_${userId}` }
          ],
          [
            { text: '📅 3 derniers mois', callback_data: `history_3months_${userId}` },
            { text: '⭐ Tous les temps', callback_data: `history_all_${userId}` }
          ],
          [
            { text: '📊 Statistiques détaillées', callback_data: `history_stats_${userId}` },
            { text: '📤 Exporter en CSV', callback_data: `history_export_${userId}` }
          ]
        ]
      }
    }
  );
}

/**
 * Gère les actions du clavier en ligne pour l'historique
 * @param {Object} query - Le callback query
 */
export const handleHistoryActions = async (query) => {
  if (!query || !query.data) {
    console.error('handleHistoryActions: query ou query.data est undefined');
    return;
  }
  
  const callbackData = query.data;
  const chatId = query.message?.chat?.id;
  const fromId = query.from?.id;
  
  try {
    if (callbackData.startsWith('history_')) {
      const [_, period, userId] = callbackData.split('_');
      
      if (period === 'export') {
        await handleExportHistory(chatId, userId);
        return;
      }
      
      if (period === 'stats') {
        await showDetailedStats(chatId, userId);
        return;
      }
      
      // Réutiliser la logique d'historique avec la nouvelle période
      // On simule un objet message (msg) pour que scoreHistory fonctionne
      await scoreHistory(
        { 
          chat: { id: chatId },
          from: { id: parseInt(userId, 10) }
        }, 
        [null, period]
      );
      
      // Supprimer le clavier après sélection
      await bot.answerCallbackQuery(query.id);
    }
  } catch (error) {
    logger.error('Erreur dans handleHistoryActions:', error);
    await bot.sendMessage(chatId, '❌ Une erreur est survenue lors du traitement de votre demande.');
  }
};

/**
 * Gère l'export de l'historique
 */
async function handleExportHistory(chatId, userId) {
  try {
    // Pas d'export CSV pour l'instant
    await bot.sendMessage(
      chatId,
      '🚧 *Export CSV*\nCette fonctionnalité est en cours de développement. Bientôt disponible !',
      { parse_mode: 'Markdown' }
    );
    
  } catch (error) {
    logger.error('Erreur lors de l\'export de l\'historique:', error);
    await bot.sendMessage(
      chatId,
      '❌ Une erreur est survenue lors de l\'export de votre historique.'
    );
  }
}

/**
 * Affiche des statistiques détaillées
 */
async function showDetailedStats(chatId, userId) {
  try {
    const { resolveUserId } = await import('../utils/helpers.js');
    const mongoUserId = await resolveUserId(userId);
    
    if (!mongoUserId) return;

    // Récupérer un historique plus large pour les stats (ex: 100 derniers)
    const historyResult = await getScoreHistory({
      userId: mongoUserId,
      limit: 100
    });
    
    const scores = historyResult?.scores || [];
    
    if (scores.length === 0) {
      return bot.sendMessage(chatId, 'Aucun score disponible pour générer des statistiques.');
    }

    const totalScore = scores.reduce((sum, s) => sum + (s.value || 0), 0);
    const averageScore = totalScore / scores.length;
    
    // Distribution par activité
    const activityMap = {};
    let bestActivity = { name: 'N/A', score: 0 };
    
    scores.forEach(s => {
      const actName = s.activity?.name || 'Inconnue';
      activityMap[actName] = (activityMap[actName] || 0) + 1;
      
      if (s.value > bestActivity.score) {
        bestActivity = { name: actName, score: s.value };
      }
    });

    let message = '📊 *Statistiques détaillées (100 derniers)*\n\n';
    message += `🎯 Activités complétées: *${scores.length}*\n`;
    message += `🏆 Score cumulatif: *${totalScore} pts*\n`;
    message += `📈 Moyenne: *${averageScore.toFixed(1)} pts/activité*\n`;
    message += `🌟 Meilleur record: *${bestActivity.name}* (${bestActivity.score} pts)\n\n`;
    
    message += '📊 Fréquentation d\'activités:\n';
    Object.entries(activityMap)
      .sort((a, b) => b[1] - a[1]) // Trier par activité la plus jouée
      .slice(0, 5) // Les 5 les plus fréquentes
      .forEach(([name, count]) => {
        const percentage = Math.round((count / scores.length) * 100);
        message += `• ${name}: ${percentage}% (${count}x)\n`;
    });
    
    await bot.sendMessage(
      chatId,
      message,
      { parse_mode: 'Markdown' }
    );
    
  } catch (error) {
    logger.error('Erreur lors de l\'affichage des statistiques:', error);
    await bot.sendMessage(
      chatId,
      '❌ Une erreur est survenue lors de la récupération des statistiques.'
    );
  }
}

// Fonctions utilitaires
function getPeriodLabel(period) {
  const periods = {
    'week': 'des 7 derniers jours',
    'month': 'des 30 derniers jours',
    '3months': 'des 3 derniers mois',
    'all': 'complet'
  };
  return periods[period] || '';
}

// Note: Les callbacks sont maintenant gérés centralement dans callbackHandler.js

export default scoreHistory;
