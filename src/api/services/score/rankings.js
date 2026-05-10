import Score from '../../models/Score.js';
import { STATS_PERIODS } from './constants.js';
import { handleScoreError } from './errors.js';

const getStartDate = (period) => {
  const now = new Date();

  switch (period) {
    case STATS_PERIODS.DAY:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case STATS_PERIODS.WEEK:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case STATS_PERIODS.MONTH:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case STATS_PERIODS.YEAR:
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
};

const buildRankingsMatch = ({ period, activityId, teamId, userId, chatId }) => {
  const match = { status: 'approved' };

  if (activityId) match.activity = activityId;
  if (teamId) match.team = teamId;
  if (userId) match.user = userId;
  if (chatId) match['metadata.chatId'] = String(chatId);

  if (period !== STATS_PERIODS.ALL) {
    const startDate = getStartDate(period);
    if (startDate) match.createdAt = { $gte: startDate };
  }

  return match;
};

const SCORE_AGGREGATES = {
  totalScore: { $sum: '$value' },
  totalNormalizedScore: { $sum: '$normalizedScore' },
  scoreCount: { $sum: 1 },
  averageScore: { $avg: '$normalizedScore' },
  lastScore: { $max: '$createdAt' }
};

const SCORE_PROJECTION = {
  totalScore: 1,
  totalNormalizedScore: 1,
  scoreCount: 1,
  averageScore: { $round: ['$averageScore', 2] },
  lastScore: 1
};

const RANKING_SCOPE_CONFIG = {
  individual: {
    targetField: 'user',
    lookupFrom: 'users',
    lookupAs: 'user',
    projection: {
      userId: '$_id',
      username: '$user.username',
      firstName: '$user.firstName',
      lastName: '$user.lastName',
      avatar: '$user.avatar'
    }
  },
  team: {
    targetField: 'team',
    lookupFrom: 'teams',
    lookupAs: 'team',
    projection: {
      teamId: '$_id',
      name: '$team.name',
      description: '$team.description',
      memberCount: { $size: '$team.members' }
    }
  }
};

const getRankingScopeConfig = (scope) => {
  const config = RANKING_SCOPE_CONFIG[scope];
  if (!config) {
    throw new Error('Scope invalide. Doit être "individual" ou "team"');
  }

  return config;
};

const buildRankingMatchStage = ({ match, scope, targetField }) => ({
  $match: {
    ...match,
    context: scope,
    [targetField]: { $exists: true }
  }
});

const buildRankingGroupStage = (targetField) => ({
  $group: {
    _id: `$${targetField}`,
    ...SCORE_AGGREGATES
  }
});

const buildRankingLookupStage = ({ lookupFrom, lookupAs }) => ({
  $lookup: {
    from: lookupFrom,
    localField: '_id',
    foreignField: '_id',
    as: lookupAs
  }
});

const buildRankingProjectStage = ({ projection }) => ({
  $project: {
    ...projection,
    ...SCORE_PROJECTION
  }
});

const buildRankingBaseStages = ({ match, scope, targetField }) => [
  buildRankingMatchStage({ match, scope, targetField }),
  buildRankingGroupStage(targetField),
  { $sort: { totalNormalizedScore: -1, lastScore: 1 } }
];

const buildRankingResultStages = ({ config, limit, offset }) => [
  { $skip: offset },
  { $limit: limit },
  buildRankingLookupStage(config),
  { $unwind: `$${config.lookupAs}` },
  buildRankingProjectStage(config)
];

const buildRankingPipelines = ({ scope, match, limit, offset }) => {
  const config = getRankingScopeConfig(scope);
  const baseStages = buildRankingBaseStages({ match, scope, targetField: config.targetField });

  return {
    rankingsPipeline: [
      ...baseStages,
      ...buildRankingResultStages({ config, limit, offset })
    ],
    countPipeline: [
      ...baseStages,
      { $count: 'total' }
    ]
  };
};

const countRankings = async (totalPipeline) => {
  const totalResult = await Score.aggregate(totalPipeline);
  return totalResult.length > 0 ? totalResult[0].total : 0;
};

/**
 * Récupère les données de classement avec support des équipes
 */
export const getRankings = async ({
  scope = 'individual',
  period = STATS_PERIODS.MONTH,
  activityId,
  teamId,
  userId,
  chatId,
  limit = 50,
  offset = 0
} = {}) => {
  try {
    const match = buildRankingsMatch({ period, activityId, teamId, userId, chatId });
    const { rankingsPipeline, countPipeline } = buildRankingPipelines({ scope, match, limit, offset });
    const rankings = await Score.aggregate(rankingsPipeline);
    const total = await countRankings(countPipeline);

    return {
      items: rankings,
      total,
      stats: {
        scope,
        period,
        activityId,
        teamId,
        chatId,
        limit,
        offset
      }
    };
  } catch (error) {
    return handleScoreError(
      error,
      'Erreur lors de la récupération du classement',
      { scope, period, activityId, teamId, chatId, limit }
    );
  }
};
