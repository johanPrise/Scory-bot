import Score from '../models/Score.js';
import User from '../models/User.js';
import Team from '../models/Team.js';
import { Activity } from '../models/activity.js';
import logger from '../utils/logger.js';

// Types de scores
const SCORE_TYPES = {
  INDIVIDUAL: 'individual',
  TEAM: 'team',
  SUB_ACTIVITY: 'sub_activity'
};

// Statuts de validation des scores
const SCORE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  DISPUTED: 'disputed'
};

// Périodes disponibles pour les statistiques
const STATS_PERIODS = {
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
 * Ajoute un score pour un utilisateur ou une équipe
 * @param {string} userId - ID de l'utilisateur (obligatoire pour les scores individuels)
 * @param {string} activityId - ID de l'activité
 * @param {number} points - Nombre de points
 * @param {Object} options - Options supplémentaires
 * @param {string} [options.teamId] - ID de l'équipe (pour les scores d'équipe)
 * @param {string} [options.subActivity] - Nom de la sous-activité
 * @param {string} [options.awardedBy] - ID de l'utilisateur qui attribue le score
 * @param {string} [options.chatId] - ID du chat
 * @param {string} [options.messageId] - ID du message
 * @param {string} [options.comments] - Commentaires sur le score
 * @param {string} [options.proofUrl] - URL de preuve
 * @param {number} [options.maxPossible=100] - Score maximum possible
 * @param {string} [options.status=SCORE_STATUS.APPROVED] - Statut du score
 * @returns {Promise<Object>} Le score créé
 */
export const addScore = async (userId, activityId, points, options = {}) => {
  try {
    // Validation des paramètres obligatoires
    if (!activityId) {
      throw new Error('L\'ID de l\'activité est requis');
    }
    
    if (isNaN(points) || points < 0) {
      throw new Error('Les points doivent être un nombre positif');
    }
    
    // Vérifier que l'activité existe
    const activity = await Activity.findById(activityId);
    if (!activity) {
      throw new Error(`Activité non trouvée avec l'ID: ${activityId}`);
    }
    
    // Déterminer le type de score et le contexte
    let scoreType, context;
    
    if (options.teamId) {
      // Score d'équipe
      scoreType = SCORE_TYPES.TEAM;
      context = 'team';
      
      // Vérifier que l'équipe existe
      const team = await Team.findById(options.teamId);
      if (!team) {
        throw new Error(`Équipe non trouvée avec l'ID: ${options.teamId}`);
      }
    } else if (userId) {
      // Score individuel
      scoreType = SCORE_TYPES.INDIVIDUAL;
      context = 'individual';
      
      // Vérifier que l'utilisateur existe
      const user = await User.findById(userId);
      if (!user) {
        throw new Error(`Utilisateur non trouvé avec l'ID: ${userId}`);
      }
    } else {
      throw new Error('Soit userId soit teamId doit être fourni');
    }
    
    // Vérifier si un score existe déjà pour cette combinaison
    const existingScoreFilter = {
      activity: activityId,
      ...(userId && { user: userId }),
      ...(options.teamId && { team: options.teamId }),
      ...(options.subActivity && { subActivity: options.subActivity })
    };
    
    const existingScore = await Score.findOne(existingScoreFilter);
    
    if (existingScore) {
      // Mettre à jour le score existant
      existingScore.value = points;
      existingScore.maxPossible = options.maxPossible || 100;
      
      if (options.comments) {
        existingScore.metadata.comments = options.comments;
      }
      
      if (options.proofUrl) {
        existingScore.metadata.evidence = options.proofUrl;
      }
      
      await existingScore.save();
      
      logger.info(`Score mis à jour: ${points} points pour ${scoreType === SCORE_TYPES.INDIVIDUAL ? 'utilisateur' : 'équipe'} ${userId || options.teamId}`);
      
      return existingScore;
    }
    
    // Créer un nouveau score
    const newScore = new Score({
      user: userId || undefined,
      team: options.teamId || undefined,
      activity: activityId,
      subActivity: options.subActivity || undefined,
      value: points,
      maxPossible: options.maxPossible || 100,
      context,
      awardedBy: options.awardedBy || userId,
      status: options.status || SCORE_STATUS.APPROVED,
      metadata: {
        chatId: options.chatId || '',
        messageId: options.messageId || '',
        comments: options.comments || '',
        evidence: options.proofUrl || ''
      }
    });
    
    await newScore.save();
    
    // Mettre à jour les statistiques de l'utilisateur ou de l'équipe
    if (userId && scoreType === SCORE_TYPES.INDIVIDUAL) {
      const user = await User.findById(userId);
      await user.updateScore(points, activityId);
    }
    
    if (options.teamId && scoreType === SCORE_TYPES.TEAM) {
      const team = await Team.findById(options.teamId);
      await team.updateScore(points);
    }
    
    // Mettre à jour les statistiques de l'activité
    activity.stats.totalSubmissions = (activity.stats.totalSubmissions || 0) + 1;
    activity.stats.lastSubmission = new Date();
    
    // Calculer la moyenne des scores
    const currentAverage = activity.stats.averageScore || 0;
    const totalSubmissions = activity.stats.totalSubmissions;
    activity.stats.averageScore = ((currentAverage * (totalSubmissions - 1)) + points) / totalSubmissions;
    
    await activity.save();
    
    logger.info(`Nouveau score ajouté: ${points} points pour ${scoreType === SCORE_TYPES.INDIVIDUAL ? 'utilisateur' : 'équipe'} ${userId || options.teamId}`);
    
    return newScore;
  } catch (error) {
    return handleScoreError(
      error,
      'Erreur lors de l\'ajout du score',
      { userId, activityId, points, options }
    );
  }
};

/**
 * Récupère le classement des scores
 * @param {string} activityId - ID de l'activité
 * @param {Object} options - Options de filtrage et de pagination
 * @param {string} [options.scope='individual'] - Type de classement ('individual' ou 'team')
 * @param {string} [options.period=STATS_PERIODS.MONTH] - Période de temps
 * @param {string} [options.teamId] - ID de l'équipe pour filtrer
 * @param {string} [options.userId] - ID de l'utilisateur pour filtrer
 * @param {string} [options.subActivity] - Nom de la sous-activité pour filtrer
 * @param {number} [options.limit=10] - Nombre de résultats
 * @param {number} [options.offset=0] - Décalage pour la pagination
 * @returns {Promise<Object>} Classement des scores
 */
export const getScoreRanking = async (activityId, options = {}) => {
  try {
    if (!activityId) {
      throw new Error('L\'ID de l\'activité est requis');
    }
    
    const {
      scope = 'individual',
      period = STATS_PERIODS.MONTH,
      teamId,
      userId,
      subActivity,
      limit = 10,
      offset = 0
    } = options;
    
    // Construire le filtre de base
    const match = { 
      activity: activityId,
      status: SCORE_STATUS.APPROVED 
    };
    
    if (teamId) match.team = teamId;
    if (userId) match.user = userId;
    if (subActivity) match.subActivity = subActivity;
    
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
        subActivity,
        limit,
        offset
      }
    };
  } catch (error) {
    return handleScoreError(
      error,
      'Erreur lors de la récupération du classement',
      { activityId, options }
    );
  }
};

/**
 * Récupère les données de classement pour l'affichage
 * @param {Object} options - Options de filtrage
 * @param {string} [options.activityId] - ID de l'activité
 * @param {string} [options.chatId] - ID du chat
 * @param {string} [options.period='month'] - Période ('day', 'week', 'month', 'year', 'all')
 * @param {number} [options.limit=10] - Nombre maximum d'entrées
 * @param {string} [options.subActivityId] - ID de la sous-activité
 * @returns {Promise<Array>} Liste des utilisateurs classés par score
 */
export const getRankingData = async ({ 
  activityId, 
  chatId, 
  period = 'month', 
  limit = 10,
  subActivityId
}) => {
  try {
    logger.info('Récupération des données de classement', { activityId, chatId, period, limit, subActivityId });
    
    // Construire le filtre de base
    const filter = { status: SCORE_STATUS.APPROVED };
    
    if (activityId) filter.activity = activityId;
    if (chatId) filter.metadata = { chatId };
    if (subActivityId) filter.subActivity = subActivityId;
    
    // Filtrer par période
    if (period !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
      }
      
      if (startDate) {
        filter.createdAt = { $gte: startDate };
      }
    }
    
    // Agréger les scores par utilisateur
    const aggregation = [
      { $match: filter },
      {
        $group: {
          _id: '$user',
          totalPoints: { $sum: '$value' },
          scoreCount: { $sum: 1 },
          lastScore: { $max: '$createdAt' }
        }
      },
      { $sort: { totalPoints: -1, lastScore: 1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      { $unwind: '$userDetails' },
      {
        $project: {
          _id: 1,
          userId: '$_id',
          username: '$userDetails.username',
          firstName: '$userDetails.firstName',
          lastName: '$userDetails.lastName',
          totalPoints: 1,
          scoreCount: 1,
          lastScore: 1
        }
      }
    ];
    
    const rankings = await Score.aggregate(aggregation);
    
    // Récupérer le classement précédent pour calculer les changements de position
    // (Simplifié pour l'exemple - dans une implémentation réelle, cela nécessiterait
    // de stocker les classements précédents dans une collection séparée)
    
    logger.info(`Récupéré ${rankings.length} entrées pour le classement`);
    return rankings;
  } catch (error) {
    return handleScoreError(
      error,
      'Erreur lors de la récupération des données de classement',
      { activityId, chatId, period, limit, subActivityId }
    );
  }
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

/**
 * Récupère l'historique des scores d'un utilisateur
 * @param {Object} options - Options de filtrage
 * @param {string} options.userId - ID de l'utilisateur
 * @param {string} [options.period='month'] - Période ('week', 'month', '3months', 'all')
 * @param {string} [options.activityId] - ID de l'activité pour filtrer
 * @param {number} [options.limit=10] - Nombre maximum d'entrées
 * @returns {Promise<Array>} Liste des scores historiques
 */
export const getScoreHistory = async ({ userId, period = 'month', activityId, limit = 10 }) => {
  try {
    if (!userId) {
      throw new Error('L\'ID de l\'utilisateur est requis');
    }

    // Construire le filtre de base
    const filter = { 
      user: userId,
      status: SCORE_STATUS.APPROVED 
    };

    if (activityId) {
      filter.activity = activityId;
    }

    // Filtrer par période
    if (period !== 'all') {
      const now = new Date();
      let startDate;

      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '3months':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
      }

      if (startDate) {
        filter.createdAt = { $gte: startDate };
      }
    }

    // Récupérer les scores avec les informations de l'activité
    const scores = await Score.find(filter)
      .populate('activity', 'name description')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Formater les données pour l'affichage
    const historyData = scores.map(score => ({
      timestamp: score.createdAt,
      activityName: score.activity?.name || 'Activité inconnue',
      value: score.value,
      comments: score.metadata?.comments || '',
      proofUrl: score.metadata?.evidence || '',
      maxPossible: score.maxPossible || 100,
      normalizedScore: score.normalizedScore || score.value
    }));

    logger.info(`Historique récupéré pour l'utilisateur ${userId}: ${historyData.length} entrées`);
    return historyData;

  } catch (error) {
    return handleScoreError(
      error,
      'Erreur lors de la récupération de l\'historique des scores',
      { userId, period, activityId, limit }
    );
  }
};

/**
 * Récupère les données pour le tableau de bord d'un utilisateur
 * @param {Object} options - Options
 * @param {string} options.userId - ID de l'utilisateur
 * @param {string} [options.type='overview'] - Type de tableau de bord
 * @returns {Promise<Object>} Données du tableau de bord
 */
export const getDashboardData = async ({ userId, type = 'overview' }) => {
  try {
    if (!userId) {
      throw new Error('L\'ID de l\'utilisateur est requis');
    }

    // Récupérer les informations de l'utilisateur
    const user = await User.findById(userId).lean();
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Calculer les dates pour les filtres
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Récupérer les scores de l'utilisateur ce mois-ci
    const monthlyScores = await Score.find({
      user: userId,
      status: SCORE_STATUS.APPROVED,
      createdAt: { $gte: startOfMonth }
    }).populate('activity', 'name').lean();

    // Récupérer les activités récentes (5 dernières)
    const recentScores = await Score.find({
      user: userId,
      status: SCORE_STATUS.APPROVED
    })
    .populate('activity', 'name')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

    // Calculer les statistiques
    const totalScore = await Score.aggregate([
      { $match: { user: userId, status: SCORE_STATUS.APPROVED } },
      { $group: { _id: null, total: { $sum: '$value' } } }
    ]);

    const monthlyActivities = monthlyScores.length;
    const monthlyPoints = monthlyScores.reduce((sum, score) => sum + score.value, 0);

    // Calcul simple de la progression de l'objectif mensuel (assumons 1000 points/mois)
    const monthlyGoal = 1000;
    const monthlyGoalProgress = Math.min(100, Math.round((monthlyPoints / monthlyGoal) * 100));

    // Calculer la position dans le classement
    const allUserScores = await Score.aggregate([
      { $match: { status: SCORE_STATUS.APPROVED } },
      { $group: { _id: '$user', totalScore: { $sum: '$value' } } },
      { $sort: { totalScore: -1 } }
    ]);

    const userTotalScore = totalScore.length > 0 ? totalScore[0].total : 0;
    const leaderboardPosition = allUserScores.findIndex(u => u._id.toString() === userId.toString()) + 1;

    // Formater les activités récentes
    const recentActivities = recentScores.map(score => ({
      name: score.activity?.name || 'Activité inconnue',
      score: score.value,
      date: score.createdAt.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit' 
      })
    }));

    const dashboardData = {
      user: {
        id: user._id,
        name: user.firstName || user.username || 'Utilisateur',
        username: user.username
      },
      recentActivities,
      stats: {
        totalScore: userTotalScore,
        monthlyActivities,
        monthlyGoalProgress,
        monthlyPoints
      },
      leaderboardPosition: leaderboardPosition || 'N/A'
    };

    logger.info(`Données du tableau de bord récupérées pour l'utilisateur ${userId}`);
    return dashboardData;

  } catch (error) {
    return handleScoreError(
      error,
      'Erreur lors de la récupération des données du tableau de bord',
      { userId, type }
    );
  }
};

export default scoreService;
export { SCORE_TYPES, SCORE_STATUS, STATS_PERIODS };