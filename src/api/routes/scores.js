import express from 'express';
import Score from '../models/Score.js';
import { Activity } from '../models/activity.js';
import User from '../models/User.js';
import Team from '../models/Team.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { authMiddleware, requireTeamPermission } from '../middleware/auth.js';
import logger from '../../utils/logger.js';
import { bot } from '../../config/bot.js'; // Import du bot Telegram
import { notifyUserScoreStatus, notifyTeamMembersNewScore } from '../utils/notifications.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

/**
 * GET /api/scores
 * Récupérer la liste des scores avec filtres
 */
router.get('/', asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    userId,
    teamId,
    activityId,
    subActivity,
    status = 'approved',
    context,
    chatId,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Construction du filtre
  const filter = {};
  
  if (userId) filter.user = userId;
  if (teamId) filter.team = teamId;
  if (activityId) filter.activity = activityId;
  if (subActivity) filter.subActivity = subActivity;
  if (status) filter.status = status;
  if (context) filter.context = context;
  if (chatId) filter['metadata.chatId'] = chatId;

  // Options de pagination et tri
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
    populate: [
      { path: 'user', select: 'username firstName lastName avatar' },
      { path: 'team', select: 'name description' },
      { path: 'activity', select: 'name description' },
      { path: 'awardedBy', select: 'username firstName lastName' }
    ]
  };

  const result = await Score.paginate(filter, options);

  res.json({
    scores: result.docs,
    pagination: {
      currentPage: result.page,
      totalPages: result.totalPages,
      totalScores: result.totalDocs,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    }
  });
}));

/**
 * GET /api/scores/:id
 * Récupérer un score par son ID
 */
router.get('/:id', asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Si l'ID n'est pas un ObjectId MongoDB valide, passer à la route suivante
  // (permet à /rankings, /personal, /pending, /team, /export d'être atteints)
  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return next('route');
  }

  const score = await Score.findById(id)
    .populate('user', 'username firstName lastName avatar')
    .populate('team', 'name description')
    .populate('activity', 'name description')
    .populate('awardedBy', 'username firstName lastName');

  if (!score) {
    throw createError(404, 'Score non trouvé');
  }

  // Vérifier l'accès
  const canView = score.user._id.toString() === req.userId.toString() ||
                  ['admin', 'superadmin'].includes(req.user.role) ||
                  (score.team && await checkTeamAccess(req.userId, score.team._id));

  if (!canView) {
    throw createError(403, 'Accès non autorisé à ce score');
  }

  res.json({ score });
}));

/**
 * POST /api/scores
 * Créer un nouveau score
 */
router.post('/', asyncHandler(async (req, res) => {
  const {
    userId,
    teamId,
    activityId,
    subActivity,
    value,
    maxPossible,
    context,
    metadata = {},
    comments
  } = req.body;
  const awardedBy = req.userId;

  // Validation des champs requis
  if (!activityId || value === undefined || !maxPossible || !context) {
    throw createError(400, 'activityId, value, maxPossible et context sont requis');
  }

  if (!userId && !teamId) {
    throw createError(400, 'userId ou teamId requis');
  }

  // Vérifier que l'activité existe
  const activity = await Activity.findById(activityId);
  if (!activity) {
    throw createError(404, 'Activité non trouvée');
  }

  // Vérifier l'utilisateur si fourni
  if (userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw createError(404, 'Utilisateur non trouvé');
    }
  }

  // Vérifier l'équipe si fournie
  if (teamId) {
    const team = await Team.findById(teamId);
    if (!team) {
      throw createError(404, 'Équipe non trouvée');
    }

    // Vérifier les permissions pour l'équipe
    const hasPermission = await checkTeamAccess(req.userId, teamId);
    if (!hasPermission && !['admin', 'superadmin'].includes(req.user.role)) {
      throw createError(403, 'Permissions insuffisantes pour cette équipe');
    }
  }

  // Vérifier si un score existe déjà pour cette combinaison
  const existingScore = await Score.findOne({
    ...(userId && { user: userId }),
    ...(teamId && { team: teamId }),
    activity: activityId,
    ...(subActivity && { subActivity })
  });

  if (existingScore) {
    throw createError(409, 'Un score existe déjà pour cette combinaison');
  }

  // Créer le score
  const score = new Score({
    user: userId || undefined,
    team: teamId || undefined,
    activity: activityId,
    subActivity: subActivity || undefined,
    value,
    maxPossible,
    context,
    awardedBy,
    metadata: {
      chatId: metadata.chatId,
      messageId: metadata.messageId,
      comments,
      evidence: metadata.evidence
    }
  });

  await score.save();

  // Mettre à jour les statistiques de l'utilisateur
  if (userId) {
    const user = await User.findById(userId);
    await user.updateScore(value, activityId);
  }

  // Mettre à jour les statistiques de l'équipe
  if (teamId) {
    const team = await Team.findById(teamId);
    await team.updateScore(value);
  }

  // Notifier les membres de l'équipe si applicable
  if (teamId) {
    await notifyTeamMembersNewScore(req, teamId, score);
  }

  logger.info(`Score créé`, { 
    scoreId: score._id,
    userId,
    teamId,
    activityId,
    value,
    awardedBy: req.user.username
  });

  res.status(201).json({
    message: 'Score créé avec succès',
    score: {
      id: score._id,
      value: score.value,
      maxPossible: score.maxPossible,
      normalizedScore: score.normalizedScore,
      context: score.context,
      status: score.status,
    },
  });
}));

/**
 * PUT /api/scores/:id
 * Mettre à jour un score
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { value, maxPossible, status, comments, rejectionReason } = req.body;

  const score = await Score.findById(id);
  if (!score) {
    throw createError(404, 'Score non trouvé');
  }

  // Vérifier les permissions
  const isAwarder = score.awardedBy.toString() === req.userId.toString();
  const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
  const hasTeamPermission = score.team ? await checkTeamAccess(req.userId, score.team) : false;

  if (!isAwarder && !isAdmin && !hasTeamPermission) {
    throw createError(403, 'Permissions insuffisantes');
  }

  // Mettre à jour les champs autorisés
  if (value !== undefined) score.value = value;
  if (maxPossible !== undefined) score.maxPossible = maxPossible;
  if (status !== undefined) score.status = status;
  if (comments !== undefined) score.metadata.comments = comments;
  if (rejectionReason !== undefined) score.rejectionReason = rejectionReason;

  await score.save();

  logger.info(`Score mis à jour`, { 
    scoreId: score._id,
    updatedBy: req.user.username,
    fields: Object.keys(req.body)
  });

  res.json({
    message: 'Score mis à jour avec succès',
    score: {
      id: score._id,
      value: score.value,
      maxPossible: score.maxPossible,
      normalizedScore: score.normalizedScore,
      status: score.status,
    },
  });
}));

/**
 * DELETE /api/scores/:id
 * Supprimer un score
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const score = await Score.findById(id);
  if (!score) {
    throw createError(404, 'Score non trouvé');
  }

  // Vérifier les permissions
  const isAwarder = score.awardedBy.toString() === req.userId.toString();
  const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
  const hasTeamPermission = score.team ? await checkTeamAccess(req.userId, score.team) : false;

  if (!isAwarder && !isAdmin && !hasTeamPermission) {
    throw createError(403, 'Permissions insuffisantes');
  }

  // Mettre à jour les statistiques avant suppression
  if (score.user && score.status === 'approved') {
    const user = await User.findById(score.user);
    if (user) {
      await user.updateScore(-score.value); // Soustraire le score
    }
  }

  if (score.team && score.status === 'approved') {
    const team = await Team.findById(score.team);
    if (team) {
      await team.updateScore(-score.value); // Soustraire le score
    }
  }

  await Score.findByIdAndDelete(id);

  logger.info(`Score supprimé`, { 
    scoreId: score._id,
    deletedBy: req.user.username
  });

  res.json({
    message: 'Score supprimé avec succès',
  });
}));

/**
 * GET /api/scores/rankings
 * Récupérer les classements
 */
router.get('/rankings', asyncHandler(async (req, res) => {
  const {
    scope = 'individual', // individual, team
    activityId,
    subActivity,
    limit = 10,
    period = 'month'
  } = req.query;

  // Construire le filtre de base
  const match = { status: 'approved' };
  
  if (activityId) match.activity = activityId;
  if (subActivity) match.subActivity = subActivity;

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
      { $limit: parseInt(limit) },
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
      { $limit: parseInt(limit) },
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
    throw createError(400, 'Scope invalide. Doit être "individual" ou "team"');
  }

  const rankings = await Score.aggregate(pipeline);

  res.json({
    rankings,
    metadata: {
      scope,
      period,
      activityId,
      subActivity,
      limit: parseInt(limit),
      total: rankings.length
    }
  });
}));

/**
 * PUT /api/scores/:id/approve
 * Approuver un score
 */
router.put('/:id/approve', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { comments } = req.body;

  const score = await Score.findById(id);
  if (!score) {
    throw createError(404, 'Score non trouvé');
  }

  // Vérifier les permissions d'approbation
  const canApprove = ['admin', 'superadmin'].includes(req.user.role) ||
                     (score.team && await checkTeamAccess(req.userId, score.team));

  if (!canApprove) {
    throw createError(403, 'Permissions insuffisantes pour approuver ce score');
  }

  if (score.status === 'approved') {
    throw createError(400, 'Ce score est déjà approuvé');
  }

  score.status = 'approved';
  score.rejectionReason = undefined;
  if (comments) {
    score.metadata.comments = comments;
  }
  score.reviewedAt = new Date();
  score.reviewedBy = req.userId;

  await score.save();

  // Mettre à jour les statistiques si le score était en attente
  if (score.user) {
    const user = await User.findById(score.user);
    if (user) {
      await user.updateScore(score.value, score.activity);
    }
  }

  if (score.team) {
    const team = await Team.findById(score.team);
    if (team) {
      await team.updateScore(score.value);
    }
  }

  // Notifier l'utilisateur en temps réel
  notifyUserScoreStatus(req, score, 'approved');

  logger.info(`Score approuvé`, { 
    scoreId: score._id,
    approvedBy: req.user.username
  });

  res.json({
    message: 'Score approuvé avec succès',
    score: {
      id: score._id,
      status: score.status,
      reviewedAt: score.reviewedAt
    }
  });
}));

/**
 * PUT /api/scores/:id/reject
 * Rejeter un score
 */
router.put('/:id/reject', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, comments } = req.body;

  if (!reason) {
    throw createError(400, 'La raison du rejet est requise');
  }

  const score = await Score.findById(id);
  if (!score) {
    throw createError(404, 'Score non trouvé');
  }

  // Vérifier les permissions de rejet
  const canReject = ['admin', 'superadmin'].includes(req.user.role) ||
                    (score.team && await checkTeamAccess(req.userId, score.team));

  if (!canReject) {
    throw createError(403, 'Permissions insuffisantes pour rejeter ce score');
  }

  if (score.status === 'rejected') {
    throw createError(400, 'Ce score est déjà rejeté');
  }

  const wasApproved = score.status === 'approved';

  score.status = 'rejected';
  score.rejectionReason = reason;
  if (comments) {
    score.metadata.comments = comments;
  }
  score.reviewedAt = new Date();
  score.reviewedBy = req.userId;

  await score.save();

  // Retirer le score des statistiques s'il était approuvé
  if (wasApproved) {
    if (score.user) {
      const user = await User.findById(score.user);
      if (user) {
        await user.updateScore(-score.value, score.activity);
      }
    }

    if (score.team) {
      const team = await Team.findById(score.team);
      if (team) {
        await team.updateScore(-score.value);
      }
    }
  }

  // Notifier l'utilisateur en temps réel
  notifyUserScoreStatus(req, score, 'rejected', { reason });

  logger.info(`Score rejeté`, { 
    scoreId: score._id,
    reason,
    rejectedBy: req.user.username
  });

  res.json({
    message: 'Score rejeté avec succès',
    score: {
      id: score._id,
      status: score.status,
      rejectionReason: score.rejectionReason,
      reviewedAt: score.reviewedAt
    }
  });
}));

/**
 * GET /api/scores/pending
 * Récupérer les scores en attente d'approbation
 */
router.get('/pending', asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    activityId,
    teamId,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Vérifier les permissions
  const canViewPending = ['admin', 'superadmin'].includes(req.user.role);
  if (!canViewPending) {
    throw createError(403, 'Permissions insuffisantes pour voir les scores en attente');
  }

  // Construction du filtre
  const filter = { status: 'pending' };
  
  if (activityId) filter.activity = activityId;
  if (teamId) filter.team = teamId;

  // Options de pagination et tri
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
    populate: [
      { path: 'user', select: 'username firstName lastName avatar' },
      { path: 'team', select: 'name description' },
      { path: 'activity', select: 'name description' },
      { path: 'awardedBy', select: 'username firstName lastName' }
    ]
  };

  const result = await Score.paginate(filter, options);

  res.json({
    scores: result.docs,
    pagination: {
      currentPage: result.page,
      totalPages: result.totalPages,
      totalScores: result.totalDocs,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    }
  });
}));

/**
 * GET /api/scores/personal
 * Récupérer les scores personnels de l'utilisateur connecté
 */
router.get('/personal', asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    activityId,
    period,
    status = 'approved',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Construction du filtre
  const filter = { 
    user: req.userId,
    context: 'individual'
  };
  
  if (activityId) filter.activity = activityId;
  if (status) filter.status = status;

  // Filtrer par période
  if (period && period !== 'all') {
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

  // Options de pagination et tri
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
    populate: [
      { path: 'activity', select: 'name description' },
      { path: 'awardedBy', select: 'username firstName lastName' }
    ]
  };

  const result = await Score.paginate(filter, options);

  // Calculer les statistiques personnelles
  const stats = await Score.aggregate([
    { $match: { user: req.userId, status: 'approved' } },
    {
      $group: {
        _id: null,
        totalScores: { $sum: 1 },
        totalPoints: { $sum: '$value' },
        averageScore: { $avg: '$normalizedScore' }
      }
    }
  ]);

  const personalStats = stats.length > 0 ? stats[0] : {
    totalScores: 0,
    totalPoints: 0,
    averageScore: 0
  };

  res.json({
    scores: result.docs,
    pagination: {
      currentPage: result.page,
      totalPages: result.totalPages,
      totalScores: result.totalDocs,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    },
    personalStats
  });
}));

/**
 * GET /api/scores/team
 * Récupérer les scores d'équipe
 */
router.get('/team', asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    teamId,
    activityId,
    period,
    status = 'approved',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Construction du filtre
  const filter = { 
    context: 'team',
    team: { $exists: true }
  };
  
  if (teamId) filter.team = teamId;
  if (activityId) filter.activity = activityId;
  if (status) filter.status = status;

  // Filtrer par période
  if (period && period !== 'all') {
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

  // Options de pagination et tri
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
    populate: [
      { path: 'team', select: 'name description' },
      { path: 'activity', select: 'name description' },
      { path: 'awardedBy', select: 'username firstName lastName' }
    ]
  };

  const result = await Score.paginate(filter, options);

  res.json({
    scores: result.docs,
    pagination: {
      currentPage: result.page,
      totalPages: result.totalPages,
      totalScores: result.totalDocs,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    }
  });
}));

/**
 * GET /api/scores/sub-activities/:activityId
 * Récupérer les scores pour les sous-activités d'une activité
 */
router.get('/sub-activities/:activityId', asyncHandler(async (req, res) => {
  const { activityId } = req.params;
  const {
    page = 1,
    limit = 20,
    subActivity,
    userId,
    teamId,
    status = 'approved',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Vérifier que l'activité existe
  const activity = await Activity.findById(activityId);
  if (!activity) {
    throw createError(404, 'Activité non trouvée');
  }

  // Construction du filtre
  const filter = { 
    activity: activityId,
    subActivity: { $exists: true, $ne: null }
  };
  
  if (subActivity) filter.subActivity = subActivity;
  if (userId) filter.user = userId;
  if (teamId) filter.team = teamId;
  if (status) filter.status = status;

  // Options de pagination et tri
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
    populate: [
      { path: 'user', select: 'username firstName lastName avatar' },
      { path: 'team', select: 'name description' },
      { path: 'activity', select: 'name description' },
      { path: 'awardedBy', select: 'username firstName lastName' }
    ]
  };

  const result = await Score.paginate(filter, options);

  // Récupérer la liste des sous-activités disponibles
  const subActivities = activity.subActivities.map(sub => ({
    name: sub.name,
    description: sub.description,
    maxScore: sub.maxScore
  }));

  res.json({
    scores: result.docs,
    subActivities,
    pagination: {
      currentPage: result.page,
      totalPages: result.totalPages,
      totalScores: result.totalDocs,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    }
  });
}));

/**
 * GET /api/scores/export
 * Exporter les scores dans différents formats
 */
router.get('/export', asyncHandler(async (req, res) => {
  const {
    format = 'csv',
    tabType = 'all',
    period,
    activity,
    team,
    search,
    includeSubScores = 'true',
    dateRange = 'current',
    fields = 'user,activity,points,team,date,status'
  } = req.query;

  // Vérifier les permissions
  const canExport = ['admin', 'superadmin'].includes(req.user.role) ||
                    req.user.permissions?.includes('export_data');

  if (!canExport) {
    throw createError(403, 'Permissions insuffisantes pour exporter les données');
  }

  // Construction du filtre basé sur les paramètres
  const filter = {};
  
  // Filtrer par type d'onglet
  switch (tabType) {
    case 'personal':
      filter.context = 'individual';
      filter.user = { $exists: true };
      break;
    case 'team':
      filter.context = 'team';
      filter.team = { $exists: true };
      break;
    case 'pending':
      filter.status = 'pending';
      break;
    default:
      // Tous les scores
      break;
  }

  // Filtrer par période
  if (period && period !== 'all') {
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

  // Filtrer par plage de dates spécifique
  if (dateRange && dateRange !== 'current') {
    const now = new Date();
    let startDate;
    
    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }
    
    if (startDate) {
      filter.createdAt = { $gte: startDate };
    }
  }

  // Autres filtres
  if (activity) filter.activity = activity;
  if (team) filter.team = team;
  if (search) {
    filter.$or = [
      { 'metadata.comments': { $regex: search, $options: 'i' } },
      { 'rejectionReason': { $regex: search, $options: 'i' } }
    ];
  }

  // Récupérer les scores avec population
  const scores = await Score.find(filter)
    .populate('user', 'username firstName lastName telegramUsername telegramId')
    .populate('team', 'name description')
    .populate('activity', 'name description category')
    .populate('awardedBy', 'username firstName lastName')
    .sort({ createdAt: -1 })
    .lean();

  // Préparer les données pour l'export
  const fieldsArray = fields.split(',');
  const exportData = [];

  for (const score of scores) {
    const row = {};
    
    if (fieldsArray.includes('user')) {
      row['Utilisateur'] = score.user ? 
        (score.user.username || `${score.user.firstName} ${score.user.lastName}`.trim() || 'Utilisateur inconnu') :
        'N/A';
      row['Telegram'] = score.user?.telegramUsername || score.user?.telegramId || 'N/A';
    }
    
    if (fieldsArray.includes('activity')) {
      row['Activité'] = score.activity?.name || 'Activité inconnue';
      row['Catégorie'] = score.activity?.category || 'N/A';
      if (score.subActivity) {
        row['Sous-activité'] = score.subActivity;
      }
    }
    
    if (fieldsArray.includes('points')) {
      row['Points'] = score.value;
      row['Points max'] = score.maxPossible;
      row['Score normalisé'] = score.normalizedScore;
    }
    
    if (fieldsArray.includes('team')) {
      row['Équipe'] = score.team?.name || (score.context === 'individual' ? 'Personnel' : 'N/A');
    }
    
    if (fieldsArray.includes('date')) {
      row['Date de création'] = score.createdAt.toLocaleDateString('fr-FR');
      row['Heure'] = score.createdAt.toLocaleTimeString('fr-FR');
    }
    
    if (fieldsArray.includes('status')) {
      row['Statut'] = score.status === 'approved' ? 'Approuvé' : 
                     score.status === 'rejected' ? 'Rejeté' : 'En attente';
      if (score.rejectionReason) {
        row['Raison du rejet'] = score.rejectionReason;
      }
    }
    
    if (fieldsArray.includes('description')) {
      row['Commentaires'] = score.metadata?.comments || '';
      row['Attribué par'] = score.awardedBy ? 
        (score.awardedBy.username || `${score.awardedBy.firstName} ${score.awardedBy.lastName}`.trim()) :
        'N/A';
    }
    
    row['Contexte'] = score.context === 'individual' ? 'Personnel' : 'Équipe';
    
    exportData.push(row);
  }

  // Générer le fichier selon le format
  let fileContent;
  let contentType;
  let fileExtension;

  switch (format.toLowerCase()) {
    case 'csv':
      fileContent = generateCSV(exportData);
      contentType = 'text/csv; charset=utf-8';
      fileExtension = 'csv';
      break;
    
    case 'json':
      fileContent = JSON.stringify(exportData, null, 2);
      contentType = 'application/json; charset=utf-8';
      fileExtension = 'json';
      break;
    
    case 'xlsx':
      // Pour Excel, on utilise le format CSV avec séparateur point-virgule
      fileContent = generateCSV(exportData, ';');
      contentType = 'application/vnd.ms-excel; charset=utf-8';
      fileExtension = 'csv';
      break;
    
    default:
      throw createError(400, 'Format d\'export non supporté');
  }

  // Générer le nom du fichier
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `scores-export-${timestamp}.${fileExtension}`;

  // Définir les headers de réponse
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

  // Ajouter BOM pour UTF-8 (nécessaire pour Excel)
  if (format.toLowerCase() === 'csv' || format.toLowerCase() === 'xlsx') {
    res.write('\uFEFF');
  }

  logger.info(`Export de scores généré`, {
    userId: req.userId,
    format,
    count: exportData.length,
    filters: { tabType, period, activity, team, search }
  });

  res.end(fileContent);
}));

/**
 * Fonction utilitaire pour générer du CSV
 */
function generateCSV(data, separator = ',') {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(separator),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header] || '';
        // Échapper les guillemets et encapsuler si nécessaire
        const stringValue = String(value);
        if (stringValue.includes(separator) || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(separator)
    )
  ].join('\n');
  
  return csvContent;
}

/**
 * Fonction utilitaire pour vérifier l'accès à une équipe
 */
async function checkTeamAccess(userId, teamId) {
  const team = await Team.findById(teamId);
  if (!team) return false;
  
  return team.members.some(member => 
    member.userId.toString() === userId.toString()
  );
}

export default router;