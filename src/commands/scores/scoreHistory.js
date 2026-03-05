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
 * @param {Object} ctx - Contexte du callback
 */
const handleHistoryActions = async (ctx) => {
  // Vérifier si c'est un callback_query
  if (!ctx?.update?.callback_query) {
    console.error('handleHistoryActions: ctx.update.callback_query est undefined');
    return;
  }
  
  const callbackData = ctx.update.callback_query.data;
  const chatId = ctx.chat?.id || ctx.update.callback_query.message?.chat?.id;
  
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
      await scoreHistory(
        { 
          ...ctx, 
          chat: { id: chatId },
          from: { id: parseInt(userId) }
        }, 
        [null, period]
      );
      
      // Supprimer le clavier après sélection
      await bot.answerCallbackQuery(ctx.update.callback_query.id);
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
    // Ici, vous pourriez générer un fichier CSV et l'envoyer
    // Pour l'instant, on simule l'export
    await bot.sendMessage(
      chatId,
      '📤 Export de votre historique en cours de préparation...',
      { parse_mode: 'Markdown' }
    );
    
    // Simuler un délai de génération
    setTimeout(async () => {
      await bot.sendDocument(
        chatId,
        'https://example.com/exports/scores-export.csv', // À remplacer par l'URL réelle
        {
          caption: '📥 Voici votre export CSV des scores',
          parse_mode: 'Markdown'
        }
      );
    }, 2000);
    
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
    // Ici, vous pourriez récupérer des statistiques avancées
    // Pour l'instant, on simule des données
    const stats = {
      totalActivities: 42,
      totalScore: 1250,
      averageScore: 29.8,
      bestActivity: 'Course à pied',
      bestScore: 150,
      activityDistribution: [
        { name: 'Course', percentage: 40 },
        { name: 'Vélo', percentage: 30 },
        { name: 'Natation', percentage: 20 },
        { name: 'Autre', percentage: 10 }
      ]
    };
    
    let message = '📊 *Statistiques détaillées*\n\n';
    message += `🎯 Activités totales: *${stats.totalActivities}*\n`;
    message += `🏆 Score total: *${stats.totalScore} pts*\n`;
    message += `📈 Moyenne: *${stats.averageScore} pts/activité*\n`;
    message += `🌟 Meilleure activité: *${stats.bestActivity}* (${stats.bestScore} pts)\n\n`;
    
    message += '📊 Répartition des activités:\n';
    stats.activityDistribution.forEach(item => {
      message += `• ${item.name}: ${item.percentage}%\n`;
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
