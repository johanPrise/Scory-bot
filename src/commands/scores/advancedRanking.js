import { bot } from '../../config/bot.js';
import { MESSAGES } from '../../config/messages.js';
import logger from '../../utils/logger.js';
import { getRankingData } from '../../api/services/scoreService.js';

/**
 * Affiche un classement avancé avec filtres
 * @param {Object} ctx - Contexte du message
 * @param {Array} match - Résultats de la correspondance d'expression régulière
 */
const advancedRanking = async (ctx, match) => {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const [_, period = 'month', activityId] = match || [];

  try {
    // Afficher un message de chargement
    const loadingMsg = await bot.sendMessage(chatId, '🔄 Chargement du classement...');

    // Récupérer les données de classement
    const rankingData = await getRankingData({
      period,
      activityId,
      userId
    });

    // Formater et envoyer le classement
    const formattedRanking = formatRanking(rankingData, period);
    
    await bot.editMessageText(formattedRanking, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });

    // Envoyer les options de filtre
    await sendFilterOptions(chatId);

  } catch (error) {
    logger.error('Erreur dans advancedRanking:', error);
    await bot.sendMessage(
      chatId,
      '❌ Une erreur est survenue lors de la récupération du classement.'
    );
  }
};

/**
 * Formate les données de classement en message Markdown
 * @param {Array} rankingData - Données de classement
 * @param {string} period - Période de classement
 * @returns {string} Message formaté
 */
function formatRanking(rankingData, period) {
  if (!rankingData || rankingData.length === 0) {
    return 'Aucune donnée de classement disponible pour cette période.';
  }

  const periodLabel = getPeriodLabel(period);
  let message = `🏆 *Classement ${periodLabel}*\n\n`;

  rankingData.forEach((entry, index) => {
    const medal = getMedal(index + 1);
    message += `${medal} *${entry.position}.* ${entry.username}: *${entry.score} pts*\n`;
    
    // Afficher la progression si disponible
    if (entry.previousPosition) {
      const change = entry.previousPosition - entry.position;
      if (change > 0) {
        message += `   ⬆️ +${change} places\n`;
      } else if (change < 0) {
        message += `   ⬇️ ${change} places\n`;
      } else {
        message += '   ➖ Même position\n';
      }
    }
    
    message += '\n';
  });

  return message;
}

/**
 * Envoie les options de filtre pour le classement
 * @param {number} chatId - ID du chat
 */
async function sendFilterOptions(chatId) {
  await bot.sendMessage(
    chatId,
    'Filtrer le classement :',
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📅 Cette semaine', callback_data: 'ranking_week' },
            { text: '📆 Ce mois-ci', callback_data: 'ranking_month' }
          ],
          [
            { text: '📅 Cette année', callback_data: 'ranking_year' },
            { text: '⭐ Tous les temps', callback_data: 'ranking_all' }
          ],
          [
            { text: '🎯 Par activité', callback_data: 'ranking_by_activity' },
            { text: '👥 Par équipe', callback_data: 'ranking_by_team' }
          ]
        ]
      }
    }
  );
}

/**
 * Gère les actions du clavier en ligne
 * @param {Object} ctx - Contexte du callback
 */
const handleRankingActions = async (ctx) => {
  // Vérifier si c'est un callback_query
  if (!ctx.update || !ctx.update.callback_query) {
    console.error('handleRankingActions: ctx.update.callback_query est undefined');
    return;
  }
  
  // Vérifier si c'est un callback_query
  if (!ctx.update || !ctx.update.callback_query) {
    console.error('handleRankingActions: ctx.update.callback_query est undefined');
    return;
  }
  
  const callbackData = ctx.update.callback_query.data;
  const chatId = ctx.chat?.id || ctx.update.callback_query.message.chat.id;
  
  try {
    if (callbackData.startsWith('ranking_')) {
      const [_, period] = callbackData.split('_');
      // Réutiliser la logique de classement avec la nouvelle période
      await advancedRanking(
        { ...ctx, chat: { id: chatId } }, 
        [null, period]
      );
      
      // Supprimer le clavier après sélection
      await bot.answerCallbackQuery(ctx.update.callback_query.id);
    }
  } catch (error) {
    logger.error('Erreur dans handleRankingActions:', error);
    await bot.sendMessage(chatId, '❌ Une erreur est survenue lors du traitement de votre demande.');
  }
};

// Fonctions utilitaires
function getPeriodLabel(period) {
  const periods = {
    'week': 'de la semaine',
    'month': 'du mois',
    'year': 'de l\'année',
    'all': 'général'
  };
  return periods[period] || '';
}

function getMedal(position) {
  const medals = {
    1: '🥇',
    2: '🥈',
    3: '🥉'
  };
  return medals[position] || '🏅';
}

// Note: Les callbacks sont maintenant gérés centralement dans callbackHandler.js

export default advancedRanking;
