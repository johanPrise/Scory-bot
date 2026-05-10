import Score from '../../models/Score.js';
import { handleScoreError } from './errors.js';

/**
 * Récupère l'historique des scores pour un utilisateur ou une équipe
 */
export const getScoreHistory = async ({ userId, teamId, activityId, chatId, limit = 50, offset = 0 } = {}) => {
  try {
    const filter = {};

    if (userId) filter.user = userId;
    if (teamId) filter.team = teamId;
    if (activityId) filter.activity = activityId;
    if (chatId) filter['metadata.chatId'] = String(chatId);

    const scores = await Score.find(filter)
      .populate('user', 'username firstName lastName')
      .populate('team', 'name')
      .populate('activity', 'name description')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset);

    const total = await Score.countDocuments(filter);

    return {
      scores,
      total,
      hasMore: offset + limit < total
    };
  } catch (error) {
    return handleScoreError(
      error,
      'Erreur lors de la récupération de l\'historique des scores',
      { userId, teamId, activityId, limit, offset }
    );
  }
};
