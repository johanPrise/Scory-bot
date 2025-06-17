import express from 'express';
import Score from '../../models/Score.js';
import { Activity } from '../../models/activity.js';
import User from '../../models/User.js';
import Team from '../../models/Team.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { authMiddleware, requireTeamPermission } from '../middleware/auth.js';
import logger from '../../utils/logger.js';

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
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

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