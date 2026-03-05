import { bot } from '../../config/bot.js';
import logger from '../../utils/logger.js';
import { getDashboardData } from '../../api/services/scoreService.js';
import { resolveUserId, trackGroup } from '../utils/helpers.js';

/**
 * Affiche un tableau de bord personnalisé
 * @param {Object} ctx - Contexte du message
 * @param {Array} match - Résultats de la correspondance d'expression régulière
 */
const dashboard = async (ctx, match) => {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;
  const [, dashboardType = 'overview'] = match || [];

  try {
    // Afficher un message de chargement
    const loadingMsg = await bot.sendMessage(chatId, '🔄 Chargement du tableau de bord...');

    // Résoudre l'ID utilisateur et tracker le groupe
    const mongoUserId = await resolveUserId(userId);
    if (mongoUserId) {
      await trackGroup(ctx, mongoUserId);
    }

    // Récupérer les données du tableau de bord
    const dashboardData = await getDashboardData({
      chatId,
      period: dashboardType === 'overview' ? 'month' : dashboardType
    });

    // Formater et envoyer le tableau de bord
    const formattedDashboard = formatDashboard(dashboardData, dashboardType);
    
    await bot.editMessageText(formattedDashboard.text, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      reply_markup: formattedDashboard.keyboard
    });

  } catch (error) {
    logger.error('Erreur dans dashboard:', error);
    await bot.sendMessage(
      chatId,
      '❌ Une erreur est survenue lors du chargement du tableau de bord.'
    );
  }
};

/**
 * Formate les données du tableau de bord
 * @param {Object} data - Données du tableau de bord
 * @param {string} type - Type de tableau de bord
 * @returns {Object} Objet avec le texte formaté et le clavier
 */
function formatDashboard(data, type) {
  switch (type) {
    case 'performance':
      return formatPerformanceDashboard(data);
    case 'goals':
      return formatGoalsDashboard(data);
    case 'comparison':
      return formatComparisonDashboard(data);
    default:
      return formatOverviewDashboard(data);
  }
}

/**
 * Formatte le tableau de bord de vue d'ensemble
 */
function formatOverviewDashboard(data) {
  const { stats = {}, recentScores = [], topPerformers = [] } = data;
  
  let message = `📊 *Tableau de bord*\n\n`;
  
  // Statistiques rapides
  message += `📊 *Statistiques générales*\n`;
  message += `🏆 Scores validés: *${stats.totalScores || 0}*\n`;
  message += `👥 Utilisateurs actifs: *${stats.totalUsers || 0}*\n`;
  message += `🏅 Équipes: *${stats.totalTeams || 0}*\n\n`;
  
  // Scores récents
  message += `🔄 *Derniers scores*\n`;
  if (recentScores && recentScores.length > 0) {
    recentScores.slice(0, 5).forEach(score => {
      const userName = score.user?.firstName || score.user?.username || 'Inconnu';
      const activityName = score.activity?.name || 'N/A';
      message += `• ${userName} - ${activityName}: *${score.value || 0} pts*\n`;
    });
  } else {
    message += "Aucun score récent.\n";
  }
  
  // Top performers
  if (topPerformers && topPerformers.length > 0) {
    message += `\n🏆 *Top performers*\n`;
    topPerformers.forEach((perf, i) => {
      const medal = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
      message += `${medal} ${perf.username || perf.firstName || 'Inconnu'}: *${perf.totalScore || 0} pts*\n`;
    });
  }
  
  // Clavier d'action
  const keyboard = {
    inline_keyboard: [
      [
        { text: '📊 Vue détaillée', callback_data: 'dashboard_performance' },
        { text: '🎯 Objectifs', callback_data: 'dashboard_goals' }
      ],
      [
        { text: '📈 Comparaison', callback_data: 'dashboard_comparison' },
        { text: '🔄 Actualiser', callback_data: 'dashboard_refresh' }
      ]
    ]
  };
  
  return { text: message, keyboard };
}

/**
 * Formatte le tableau de bord de performance
 */
function formatPerformanceDashboard(data) {
  // Implémentation simplifiée
  let message = `📊 *Performances détaillées*\n\n`;
  
  // Graphique de progression (en texte pour l'instant)
  message += "Graphique de progression des 7 derniers jours :\n";
  message += "🟩🟩🟩🟨⬜⬜⬜ +15% vs semaine dernière\n\n";
  
  message += "📈 *Statistiques hebdomadaires*\n";
  message += "• Activités: 12 (+3)\n";
  message += "• Score total: 350 pts (+45)\n";
  message += "• Temps total: 8h 30m\n\n";
  
  message += "🏆 *Records personnels*\n";
  message += "• Meilleur score: 150 pts (Course à pied)\n";
  message += "• Série active: 5 jours consécutifs\n";
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: '⬅️ Retour', callback_data: 'dashboard_overview' },
        { text: '📅 Voir par période', callback_data: 'dashboard_period' }
      ]
    ]
  };
  
  return { text: message, keyboard };
}

/**
 * Formatte le tableau de bord des objectifs
 */
function formatGoalsDashboard(data) {
  let message = `🎯 *Objectifs et récompenses*\n\n`;
  
  // Objectifs en cours
  message += `📌 *Objectifs en cours*\n`;
  message += `🏃‍♂️ 10 activités ce mois-ci: 7/10 (70%)\n`;
  message += `⭐ Atteindre 1000 points: 750/1000 (75%)\n`;
  message += `🔥 Série de 7 jours: 5/7 jours\n\n`;
  
  // Récompenses
  message += `🏆 *Récompenses à venir*\n`;
  message += `• 10 activités: 50 points\n`;
  message += `• 1000 points: Badge "Champion"\n\n`;
  
  message += `📅 *Prochain objectif*\n`;
  message += `Atteindre 10 activités ce mois-ci (3 restantes)\n`;
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: '⬅️ Retour', callback_data: 'dashboard_overview' },
        { text: '🎯 Nouvel objectif', callback_data: 'goal_create' }
      ]
    ]
  };
  
  return { text: message, keyboard };
}

/**
 * Formatte le tableau de bord de comparaison
 */
function formatComparisonDashboard(data) {
  let message = `📊 *Comparaison*\n\n`;
  
  // Comparaison avec la moyenne
  message += `🔍 *Comparaison avec la moyenne*\n`;
  message += `• Vos activités: 12\n`;
  message += `• Moyenne des utilisateurs: 9\n`;
  message += `• Position: Top 15%\n\n`;
  
  // Classement
  message += `🏅 *Votre classement*\n`;
  message += `• Global: #42\n`;
  message += `• Amis: #3\n`;
  message += `• Région: #8\n\n`;
  
  // Amis actifs
  message += `👥 *Amis actifs*\n`;
  message += `1. @johndoe: 15 activités\n`;
  message += `2. @janedoe: 12 activités\n`;
  message += `3. Vous: 12 activités\n`;
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: '⬅️ Retour', callback_data: 'dashboard_overview' },
        { text: '👥 Voir plus', callback_data: 'comparison_more' }
      ]
    ]
  };
  
  return { text: message, keyboard };
}

/**
 * Gère les actions du tableau de bord
 */
const handleDashboardActions = async (ctx) => {
  // Vérifier si c'est un callback_query
  if (!ctx?.update?.callback_query) {
    console.error('handleDashboardActions: ctx.update.callback_query est undefined');
    return;
  }
  
  const callbackData = ctx.update.callback_query.data;
  const chatId = ctx.chat?.id || ctx.update?.callback_query?.message?.chat?.id;
  
  try {
    if (callbackData.startsWith('dashboard_')) {
      const action = callbackData.split('_')[1];
      
      // Rafraîchir le tableau de bord avec le type sélectionné
      await dashboard(
        { 
          ...ctx, 
          chat: { id: chatId },
          from: { id: ctx.from.id }
        }, 
        [null, action]
      );
      
      // Supprimer le clavier après sélection
      await bot.answerCallbackQuery(ctx.update.callback_query.id);
    }
  } catch (error) {
    logger.error('Erreur dans handleDashboardActions:', error);
    await bot.sendMessage(chatId, '❌ Une erreur est survenue lors du traitement de votre demande.');
  }
};

// Enregistrer les gestionnaires
export const setupDashboardHandlers = () => {
  // Note: Les callbacks sont maintenant gérés centralement dans callbackHandler.js
  // Cette fonction est conservée pour la compatibilité
  console.log('Dashboard handlers configurés (gérés centralement)');
};

export default dashboard;
