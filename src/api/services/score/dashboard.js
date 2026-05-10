import Score from '../../models/Score.js';
import User from '../../models/User.js';
import Team from '../../models/Team.js';
import { STATS_PERIODS } from './constants.js';
import { handleScoreError } from './errors.js';
import { getRankings } from './rankings.js';

const getDashboardStats = async (chatId) => {
  return {
    totalScores: await Score.countDocuments({ status: 'approved', 'metadata.chatId': String(chatId) }),
    totalUsers: await User.countDocuments({ status: 'active' }),
    totalTeams: await Team.countDocuments({ chatId: String(chatId) })
  };
};

const getRecentScores = (chatId) => {
  return Score.find({ status: 'approved', 'metadata.chatId': String(chatId) })
    .populate('user', 'username firstName lastName')
    .populate('team', 'name')
    .populate('activity', 'name')
    .sort({ createdAt: -1 })
    .limit(10);
};

/**
 * Récupère les données du tableau de bord
 */
export const getDashboardData = async ({ chatId, period = STATS_PERIODS.MONTH } = {}) => {
  try {
    const [stats, recentScores, topPerformers] = await Promise.all([
      getDashboardStats(chatId),
      getRecentScores(chatId),
      getRankings({
        scope: 'individual',
        period,
        chatId: String(chatId),
        limit: 5
      })
    ]);

    return {
      stats,
      recentScores,
      topPerformers: topPerformers.items || []
    };
  } catch (error) {
    return handleScoreError(
      error,
      'Erreur lors de la récupération des données du tableau de bord',
      { chatId, period }
    );
  }
};
