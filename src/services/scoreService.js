import Score from '../models/Score.js';
import { Activity } from '../models/activity.js';
import User from '../models/User.js';
import Team from '../models/Team.js';
import logger from '../utils/logger.js';

// Types de scores
export const SCORE_TYPES = {
  INDIVIDUAL: 'individual',
  TEAM: 'team',
  SUB_ACTIVITY: 'sub_activity'
};

// Statuts de validation des scores
export const SCORE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  DISPUTED: 'disputed'
};

// Périodes disponibles pour les statistiques
export const STATS_PERIODS = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
  ALL: 'all'
};

/**
 * Gestion des erreurs pour le service de scores
 */
const handleScoreError = (error, customMessage, context = {}) => {
  const errorDetails = {
    message: error.message,
    status: error.status || 500,
    code: error.code || 'SCORE_SERVICE_ERROR',
    context,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  };

  logger.error(`${customMessage}: ${error.message}`, { 
    error: errorDetails,
    context 
  });
  
  const errorToThrow = new Error(customMessage);
  errorToThrow.status = error.status || 500;
  errorToThrow.details = errorDetails;
  throw errorToThrow;
};

/**
 * Service principal de gestion des scores - Version MongoDB directe
 */
const scoreService = {
  /**
   * Récupère les données de classement avec support des équipes
   */
  async getRankings({
    scope = 'individual',
    period = STATS_PERIODS.MONTH,
    activityId,
    teamId,
    userId,
    limit = 50,
    offset = 0
  } = {}) {
    try {
      // Construire le filtre de base
      const match = { status: 'approved' };
      
      if (activityId) match.activity = activityId;
      if (teamId) match.team = teamId;
      if (userId) match.user = userId;

      // Filtrer par période
      if (period !== STATS_PERIODS.ALL) {
        const now = new Date();
        let startDate;
        
        switch (period) {
          case STATS_PERIODS.DAY:
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case STATS_PERIODS.WEEK:
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case STATS_PERIODS.MONTH:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case STATS_PERIODS.YEAR:
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
        }
        
        if (startDate) {
          match.createdAt = { $gte: startDate };
        }
      }

      let pipeline;

      if (scope === 'individual') {
        match.context = 'individual';
        match.user = { $exists: true };
        
        pipeline = [
          { $match: match },
          {
            $group: {
              _id: '$user',
              totalScore: { $sum: '$value' },
              totalNormalizedScore: { $sum: '$normalizedScore' },
              scoreCount: { $sum: 1 },
              averageScore: { $avg: '$normalizedScore' },
              lastScore: { $max: '$createdAt' }
            }
          },
          { $sort: { totalNormalizedScore: -1, lastScore: 1 } },
          { $skip: offset },
          { $limit: limit },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'user'
            }
          },
          { $unwind: '$user' },
          {
            $project: {
              userId: '$_id',
              username: '$user.username',
              firstName: '$user.firstName',
              lastName: '$user.lastName',
              avatar: '$user.avatar',
              totalScore: 1,
              totalNormalizedScore: 1,
              scoreCount: 1,
              averageScore: { $round: ['$averageScore', 2] },
              lastScore: 1
            }
          }
        ];
      } else if (scope === 'team') {
        match.context = 'team';
        match.team = { $exists: true };
        
        pipeline = [
          { $match: match },
          {
            $group: {
              _id: '$team',
              totalScore: { $sum: '$value' },
              totalNormalizedScore: { $sum: '$normalizedScore' },
              scoreCount: { $sum: 1 },
              averageScore: { $avg: '$normalizedScore' },
              lastScore: { $max: '$createdAt' }
            }
          },
          { $sort: { totalNormalizedScore: -1, lastScore: 1 } },
          { $skip: offset },
          { $limit: limit },
          {
            $lookup: {
              from: 'teams',
              localField: '_id',
              foreignField: '_id',
              as: 'team'
            }
          },
          { $unwind: '$team' },
          {
            $project: {
              teamId: '$_id',
              name: '$team.name',
              description: '$team.description',
              memberCount: { $size: '$team.members' },
              totalScore: 1,
              totalNormalizedScore: 1,
              scoreCount: 1,
              averageScore: { $round: ['$averageScore', 2] },
              lastScore: 1
            }
          }
        ];
      } else {
        throw new Error('Scope invalide. Doit être "individual" ou "team"');
      }

      const rankings = await Score.aggregate(pipeline);
      
      // Compter le total pour la pagination
      const totalPipeline = pipeline.slice(0, -3); // Enlever skip, limit et lookup
      totalPipeline.push({ $count: 'total' });
      const totalResult = await Score.aggregate(totalPipeline);
      const total = totalResult.length > 0 ? totalResult[0].total : 0;

      return {
        items: rankings,
        total,
        stats: {
          scope,
          period,
          activityId,
          teamId,
          limit,
          offset
        }
      };
    } catch (error) {
      return handleScoreError(
        error,
        'Erreur lors de la récupération du classement',
        { scope, period, activityId, teamId, limit }
      );
    }
  },

  /**
   * Ajoute un nouveau score (individuel ou d'équipe)
   */
  async addScore(scoreData) {
    try {
      const requiredFields = ['type', 'entityId', 'activityId', 'value'];
      const missingFields = requiredFields.filter(field => !(field in scoreData));
      
      if (missingFields.length > 0) {
        throw new Error(`Champs manquants: ${missingFields.join(', ')}`);
      }

      // Validation du type de score
      if (!Object.values(SCORE_TYPES).includes(scoreData.type)) {
        throw new Error(`Type de score invalide. Doit être l'un des suivants: ${Object.values(SCORE_TYPES).join(', ')}`);
      }

      // Vérifier que l'activité existe
      const activity = await Activity.findById(scoreData.activityId);
      if (!activity) {
        throw new Error('Activité non trouvée');
      }

      // Déterminer le contexte et les entités
      let context, userId, teamId;
      
      if (scoreData.type === SCORE_TYPES.INDIVIDUAL) {
        context = 'individual';
        userId = scoreData.entityId;
        
        // Vérifier que l'utilisateur existe
        const user = await User.findById(userId);
        if (!user) {
          throw new Error('Utilisateur non trouvé');
        }
      } else if (scoreData.type === SCORE_TYPES.TEAM) {
        context = 'team';
        teamId = scoreData.entityId;
        
        // Vérifier que l'équipe existe
        const team = await Team.findById(teamId);
        if (!team) {
          throw new Error('Équipe non trouvée');
        }
      }

      // Vérifier si un score existe déjà
      const existingScore = await Score.findOne({
        ...(userId && { user: userId }),
        ...(teamId && { team: teamId }),
        activity: scoreData.activityId,
        ...(scoreData.subActivityId && { subActivity: scoreData.subActivityId })
      });

      if (existingScore) {
        throw new Error('Un score existe déjà pour cette combinaison');
      }

      // Créer le score
      const score = new Score({
        user: userId,
        team: teamId,
        activity: scoreData.activityId,
        subActivity: scoreData.subActivityId,
        value: scoreData.value,
        maxPossible: scoreData.maxPossible || 100,
        context,
        awardedBy: scoreData.awardedBy,
        status: scoreData.status || SCORE_STATUS.APPROVED,
        metadata: {
          chatId: scoreData.chatId,
          messageId: scoreData.messageId,
          comments: scoreData.comments,
          evidence: scoreData.proofUrl
        }
      });

      await score.save();

      // Mettre à jour les statistiques
      if (userId) {
        const user = await User.findById(userId);
        await user.updateScore(scoreData.value, scoreData.activityId);
      }

      if (teamId) {
        const team = await Team.findById(teamId);
        await team.updateScore(scoreData.value);
      }

      logger.info(`Nouveau score ajouté: ${scoreData.value} points pour ${scoreData.type} ${scoreData.entityId}`);
      
      return score;
    } catch (error) {
      return handleScoreError(
        error,
        'Erreur lors de l\'ajout du score',
        { type: scoreData?.type, entityId: scoreData?.entityId, activityId: scoreData?.activityId }
      );
    }
  },

  /**
   * Met à jour un score existant
   */
  async updateScore(scoreId, updates) {
    try {
      if (!scoreId) {
        throw new Error('ID du score manquant');
      }

      const score = await Score.findById(scoreId);
      if (!score) {
        throw new Error('Score non trouvé');
      }

      // Validation des mises à jour
      const allowedUpdates = ['value', 'maxPossible', 'status', 'comments', 'rejectionReason'];
      const invalidUpdates = Object.keys(updates).filter(key => !allowedUpdates.includes(key));
      
      if (invalidUpdates.length > 0) {
        throw new Error(`Mises à jour non autorisées: ${invalidUpdates.join(', ')}`);
      }

      // Appliquer les mises à jour
      Object.assign(score, updates);
      
      if (updates.status) {
        score.reviewedAt = new Date();
      }

      await score.save();

      logger.info(`Score ${scoreId} mis à jour`, { updates: Object.keys(updates) });
      return score;
    } catch (error) {
      return handleScoreError(
        error,
        `Erreur lors de la mise à jour du score ${scoreId}`,
        { scoreId, updates: Object.keys(updates) }
      );
    }
  },

  /**
   * Supprime un score
   */
  async deleteScore(scoreId, deletedBy) {
    try {
      if (!scoreId || !deletedBy) {
        throw new Error('ID du score ou de l\'utilisateur manquant');
      }

      const score = await Score.findById(scoreId);
      if (!score) {
        throw new Error('Score non trouvé');
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

      await Score.findByIdAndDelete(scoreId);
      
      logger.info(`Score ${scoreId} supprimé par ${deletedBy}`);
      return true;
    } catch (error) {
      return handleScoreError(
        error,
        `Erreur lors de la suppression du score ${scoreId}`,
        { scoreId, deletedBy }
      );
    }
  }
};

export default scoreService;
export { SCORE_TYPES, SCORE_STATUS, STATS_PERIODS };