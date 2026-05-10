import express from 'express';
import Score from '../models/Score.js';
import { Activity } from '../models/activity.js';
import User from '../models/User.js';
import Team from '../models/Team.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireChatId, validateChatAccess } from '../middleware/chatIdValidator.js';
import logger from '../../utils/logger.js';
import { notifyUserScoreStatus, notifyTeamMembersNewScore } from '../utils/notifications.js';
import { resourceInChatFilter, scoreInChatFilter, scoresForChatFilter } from '../utils/chatScope.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Toutes les routes nécessitent un chatId valide et l'accès au groupe
router.use(requireChatId);
router.use(validateChatAccess);

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
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Construction du filtre - toujours filtrer par chatId validé
  const filter = {
    'metadata.chatId': req.chatId
  };
  
  if (userId) filter.user = userId;
  if (teamId) filter.team = teamId;
  if (activityId) filter.activity = activityId;
  if (subActivity) filter.subActivity = subActivity;
  if (status) filter.status = status;
  if (context) filter.context = context;

  // Options de pagination et tri
  const options = {
    page: Number.parseInt(page),
    limit: Number.parseInt(limit),
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
 * Valide les champs requiredis pour la création d'un score
 */
async function validateScoreCreationInput(body) {
  validateRequiredFields(body);
  validateUserOrTeam(body);
}

/**
 * Valide que les champs obligatoires sont présents
 */
function validateRequiredFields({ activityId, value, maxPossible, context }) {
  const missingFields = [];

  if (!activityId) missingFields.push('activityId');
  if (value === undefined) missingFields.push('value');
  if (maxPossible === undefined) missingFields.push('maxPossible');
  if (maxPossible === null) missingFields.push('maxPossible');
  if (!context) missingFields.push('context');

  if (missingFields.length > 0) {
    throw createError(400, 'activityId, value, maxPossible et context sont requis');
  }
}

/**
 * Valide qu'au moins un userId ou teamId est fourni
 */
function validateUserOrTeam({ userId, teamId }) {
  if (!userId && !teamId) {
    throw createError(400, 'userId ou teamId requis');
  }
}

function isAdminRole(userRole) {
  return ['admin', 'superadmin'].includes(userRole);
}

async function validateActivityExists(activityId, chatId) {
  const activity = await Activity.findOne(resourceInChatFilter(activityId, chatId));
  if (!activity) {
    throw createError(404, 'Activité non trouvée');
  }
}

async function validateUserExists(userId) {
  if (!userId) return;

  const user = await User.findById(userId);
  if (!user) {
    throw createError(404, 'Utilisateur non trouvé');
  }
}

async function validateTeamPermissions({ teamId, userReqId, userRole, chatId }) {
  if (!teamId) return;

  const team = await Team.findOne(resourceInChatFilter(teamId, chatId));
  if (!team) {
    throw createError(404, 'Équipe non trouvée');
  }

  const hasPermission = team.members.some(member =>
    member.userId.toString() === userReqId.toString()
  );
  if (!hasPermission && !isAdminRole(userRole)) {
    throw createError(403, 'Permissions insuffisantes pour cette équipe');
  }
}

/**
 * Valide l'existence et l'accès aux entités associées au score
 */
async function validateScoreEntities({ userId, teamId, activityId, userReqId, userRole, chatId }) {
  await validateActivityExists(activityId, chatId);
  await validateUserExists(userId);
  await validateTeamPermissions({ teamId, userReqId, userRole, chatId });
}

/**
 * Vérifie si un score similaire existe déjà
 */
async function checkDuplicateScore({ userId, teamId, activityId, subActivity, chatId }) {
  const existingScore = await Score.findOne({
    ...scoresForChatFilter(chatId),
    ...(userId && { user: userId }),
    ...(teamId && { team: teamId }),
    activity: activityId,
    ...(subActivity && { subActivity })
  });

  if (existingScore) {
    throw createError(409, 'Un score existe déjà pour cette combinaison');
  }
}

/**
 * Crée un nouveau score avec les données fournies
 */
async function createNewScore(body, req) {
  const { userId, teamId, activityId, subActivity, value, maxPossible, context, metadata = {}, comments } = body;

  const score = new Score({
    user: userId || undefined,
    team: teamId || undefined,
    activity: activityId,
    subActivity: subActivity || undefined,
    value,
    maxPossible,
    context,
    awardedBy: req.userId,
    metadata: {
      chatId: req.chatId,
      messageId: metadata.messageId,
      comments,
      evidence: metadata.evidence
    }
  });

  await score.save();
  return score;
}

/**
 * Met à jour les statistiques des entités associées au score
 */
async function updateStatistics({ userId, teamId, value, activityId, chatId }) {
  await updateUserScoreIfExists(userId, value, activityId);
  await updateTeamScoreIfExists(teamId, value, chatId);
}

async function canApproveScore(score, userId, userRole, chatId) {
  return isAdminRole(userRole) || (score.team && await checkTeamAccess(userId, score.team, chatId));
}

async function canRejectScore(score, userId, userRole, chatId) {
  return isAdminRole(userRole) || (score.team && await checkTeamAccess(userId, score.team, chatId));
}

function validateScoreApprovalStatus(score) {
  if (score.status === 'approved') {
    throw createError(400, 'Ce score est déjà approuvé');
  }
}

function applyScoreApproval(score, comments, userId) {
  score.status = 'approved';
  score.rejectionReason = undefined;
  if (comments) {
    score.metadata.comments = comments;
  }
  score.reviewedAt = new Date();
  score.reviewedBy = userId;
}

async function updateUserScoreIfExists(userId, value, activityId) {
  if (!userId) return;

  const user = await User.findById(userId);
  if (user) {
    await user.updateScore(value, activityId);
  }
}

async function updateTeamScoreIfExists(teamId, value, chatId) {
  if (!teamId) return;

  const teamFilter = { _id: teamId };
  if (chatId) teamFilter.chatId = chatId;
  const team = await Team.findOne(teamFilter);
  if (team) {
    await team.updateScore(value);
  }
}

async function updateStatisticsOnApproval(score) {
  await updateUserScoreIfExists(score.user, score.value, score.activity);
  await updateTeamScoreIfExists(score.team, score.value, score.metadata?.chatId);
}

function validateRejectionReason(reason) {
  if (!reason) {
    throw createError(400, 'La raison du rejet est requise');
  }
}

function validateScoreRejectionStatus(score) {
  if (score.status === 'rejected') {
    throw createError(400, 'Ce score est déjà rejeté');
  }
}

function applyScoreRejection(score, reason, comments, userId) {
  score.status = 'rejected';
  score.rejectionReason = reason;
  if (comments) {
    score.metadata.comments = comments;
  }
  score.reviewedAt = new Date();
  score.reviewedBy = userId;
}

async function rollbackStatisticsOnRejection(score, wasApproved) {
  if (!wasApproved) return;

  await updateUserScoreIfExists(score.user, -score.value, score.activity);
  await updateTeamScoreIfExists(score.team, -score.value, score.metadata?.chatId);
}

/**
 * POST /api/scores
 * Créer un nouveau score
 */
router.post('/', asyncHandler(async (req, res) => {
  const { userId, teamId, activityId, subActivity } = req.body;

  // Valider les données d'entrée
  await validateScoreCreationInput(req.body);
  await validateScoreEntities({ userId, teamId, activityId, userReqId: req.userId, userRole: req.user.role, chatId: req.chatId });
  await checkDuplicateScore({
    userId,
    teamId,
    activityId,
    subActivity,
    chatId: req.chatId,
  });

  // Créer le score
  const score = await createNewScore(req.body, req);

  // Mettre à jour les statistiques
  await updateStatistics({
    userId,
    teamId,
    value: score.value,
    activityId,
    chatId: req.chatId,
  });

  // Notifier les membres de l'équipe si applicable
  if (teamId) {
    await notifyTeamMembersNewScore(req, teamId, score);
  }

  logger.info(`Score créé`, { 
    scoreId: score._id,
    userId,
    teamId,
    activityId,
    value: score.value,
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

  // Construire le filtre de base - toujours filtrer par chatId validé
  const match = { 
    status: 'approved',
    'metadata.chatId': req.chatId
  };
  
  if (activityId) match.activity = activityId;
  if (subActivity) match.subActivity = subActivity;

  // Filtrer par période
  const periodStart = getPeriodStartDate(period);
  if (periodStart) match.createdAt = { $gte: periodStart };

  const pipeline = buildRankingPipeline(scope, match, Number.parseInt(limit));

  const rankings = await Score.aggregate(pipeline);

  res.json({
    rankings,
    metadata: { scope, period, activityId, subActivity, limit: Number.parseInt(limit), total: rankings.length }
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
  const filter = { 
    status: 'pending',
    'metadata.chatId': req.chatId // Filtrer par groupe
  };
  
  if (activityId) filter.activity = activityId;
  if (teamId) filter.team = teamId;

  // Options de pagination et tri
  const options = {
    page: Number.parseInt(page),
    limit: Number.parseInt(limit),
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

  // Construction du filtre - toujours filtrer par chatId validé
  const filter = { 
    user: req.userId,
    context: 'individual',
    'metadata.chatId': req.chatId
  };
  
  if (activityId) filter.activity = activityId;
  if (status) filter.status = status;

  // Filtrer par période
  const personalPeriodStart = getPeriodStartDate(period);
  if (personalPeriodStart) filter.createdAt = { $gte: personalPeriodStart };

  // Options de pagination et tri
  const options = {
    page: Number.parseInt(page),
    limit: Number.parseInt(limit),
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
  const teamPeriodStart = getPeriodStartDate(period);
  if (teamPeriodStart) filter.createdAt = { $gte: teamPeriodStart };

  // Options de pagination et tri
  const options = {
    page: Number.parseInt(page),
    limit: Number.parseInt(limit),
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
  const activity = await Activity.findOne(resourceInChatFilter(activityId, req.chatId));
  if (!activity) {
    throw createError(404, 'Activité non trouvée');
  }

  // Construction du filtre
  const filter = { 
    activity: activityId,
    'metadata.chatId': req.chatId,
    subActivity: { $exists: true, $ne: null }
  };
  
  if (subActivity) filter.subActivity = subActivity;
  if (userId) filter.user = userId;
  if (teamId) filter.team = teamId;
  if (status) filter.status = status;

  // Options de pagination et tri
  const options = {
    page: Number.parseInt(page),
    limit: Number.parseInt(limit),
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
  const filter = {
    'metadata.chatId': req.chatId // Filtrer par groupe
  };
  
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
  const exportPeriodStart = getPeriodStartDate(period);
  if (exportPeriodStart) filter.createdAt = { $gte: exportPeriodStart };

  // Filtrer par plage de dates spécifique
  const exportDateRangeStart = getDateRangeStart(dateRange);
  if (exportDateRangeStart) filter.createdAt = { $gte: exportDateRangeStart };

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
  const fieldsSet = new Set(fields.split(','));
  const exportData = scores.map(score => buildExportRow(score, fieldsSet));

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
 * Construit le pipeline d'agrégation pour les classements
 */
function buildRankingPipeline(scope, match, limit) {
  if (scope === 'individual') {
    match.context = 'individual';
    match.user = { $exists: true };
    return [
      { $match: match },
      { $group: { _id: '$user', totalScore: { $sum: '$value' }, totalNormalizedScore: { $sum: '$normalizedScore' }, scoreCount: { $sum: 1 }, averageScore: { $avg: '$normalizedScore' }, lastScore: { $max: '$createdAt' } } },
      { $sort: { totalNormalizedScore: -1, lastScore: 1 } },
      { $limit: limit },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { userId: '$_id', username: '$user.username', firstName: '$user.firstName', lastName: '$user.lastName', avatar: '$user.avatar', totalScore: 1, totalNormalizedScore: 1, scoreCount: 1, averageScore: { $round: ['$averageScore', 2] }, lastScore: 1 } }
    ];
  }
  if (scope === 'team') {
    match.context = 'team';
    match.team = { $exists: true };
    return [
      { $match: match },
      { $group: { _id: '$team', totalScore: { $sum: '$value' }, totalNormalizedScore: { $sum: '$normalizedScore' }, scoreCount: { $sum: 1 }, averageScore: { $avg: '$normalizedScore' }, lastScore: { $max: '$createdAt' } } },
      { $sort: { totalNormalizedScore: -1, lastScore: 1 } },
      { $limit: limit },
      { $lookup: { from: 'teams', localField: '_id', foreignField: '_id', as: 'team' } },
      { $unwind: '$team' },
      { $project: { teamId: '$_id', name: '$team.name', description: '$team.description', memberCount: { $size: '$team.members' }, totalScore: 1, totalNormalizedScore: 1, scoreCount: 1, averageScore: { $round: ['$averageScore', 2] }, lastScore: 1 } }
    ];
  }
  throw createError(400, 'Scope invalide. Doit être "individual" ou "team"');
}

/**
 * Construit une ligne d'export pour un score
 */
function buildExportRow(score, fieldsSet) {
  const row = {
    ...buildUserExportFields(score, fieldsSet),
    ...buildActivityExportFields(score, fieldsSet),
    ...buildPointsExportFields(score, fieldsSet),
    ...buildTeamExportFields(score, fieldsSet),
    ...buildDateExportFields(score, fieldsSet),
    ...buildStatusExportFields(score, fieldsSet),
    ...buildDescriptionExportFields(score, fieldsSet),
  };

  row['Contexte'] = score.context === 'individual' ? 'Personnel' : 'Équipe';
  return row;
}

function buildUserExportFields(score, fieldsSet) {
  if (!fieldsSet.has('user')) return {};

  return {
    'Utilisateur': getExportUserName(score.user),
    'Telegram': getExportTelegram(score.user),
  };
}

function getExportUserName(user) {
  if (!user) return 'N/A';

  return user.username || getExportFullName(user) || 'Utilisateur inconnu';
}

function getExportFullName(user) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ');
}

function getExportTelegram(user) {
  if (!user) return 'N/A';

  return user.telegramUsername || user.telegramId || 'N/A';
}

function buildActivityExportFields(score, fieldsSet) {
  if (!fieldsSet.has('activity')) return {};

  const fields = {
    'Activité': score.activity?.name || 'Activité inconnue',
    'Catégorie': score.activity?.category || 'N/A',
  };

  if (score.subActivity) {
    fields['Sous-activité'] = score.subActivity;
  }

  return fields;
}

function buildPointsExportFields(score, fieldsSet) {
  if (!fieldsSet.has('points')) return {};

  return {
    'Points': score.value,
    'Points max': score.maxPossible,
    'Score normalisé': score.normalizedScore,
  };
}

function buildTeamExportFields(score, fieldsSet) {
  if (!fieldsSet.has('team')) return {};

  return {
    'Équipe': score.team?.name || (score.context === 'individual' ? 'Personnel' : 'N/A'),
  };
}

function buildDateExportFields(score, fieldsSet) {
  if (!fieldsSet.has('date')) return {};

  return {
    'Date de création': score.createdAt.toLocaleDateString('fr-FR'),
    'Heure': score.createdAt.toLocaleTimeString('fr-FR'),
  };
}

function buildStatusExportFields(score, fieldsSet) {
  if (!fieldsSet.has('status')) return {};

  const statusMap = { approved: 'Approuvé', rejected: 'Rejeté' };
  const fields = {
    'Statut': statusMap[score.status] ?? 'En attente',
  };

  if (score.rejectionReason) {
    fields['Raison du rejet'] = score.rejectionReason;
  }

  return fields;
}

function buildDescriptionExportFields(score, fieldsSet) {
  if (!fieldsSet.has('description')) return {};

  return {
    'Commentaires': score.metadata?.comments || '',
    'Attribué par': score.awardedBy
      ? (score.awardedBy.username || `${score.awardedBy.firstName} ${score.awardedBy.lastName}`.trim())
      : 'N/A',
  };
}

/**
 * Retourne la date de début pour un filtre de période relatif
 */
function getPeriodStartDate(period) {
  const periodMs = {
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000
  };
  const ms = period && period !== 'all' ? periodMs[period] : null;
  return ms ? new Date(Date.now() - ms) : null;
}

/**
 * Retourne la date de début pour un filtre de plage de dates calendaires
 */
function getDateRangeStart(dateRange) {
  if (!dateRange || dateRange === 'current') return null;
  const now = new Date();
  const ranges = {
    today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    week: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    month: new Date(now.getFullYear(), now.getMonth(), 1),
    year: new Date(now.getFullYear(), 0, 1)
  };
  return ranges[dateRange] ?? null;
}

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
        const stringValue = String(value);
        return formatCsvValue(stringValue, separator);
      }).join(separator)
    )
  ].join('\n');
  
  return csvContent;
}

function formatCsvValue(value, separator) {
  if (!shouldQuoteCsvValue(value, separator)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

function shouldQuoteCsvValue(value, separator) {
  return [
    separator,
    '"',
    '\n'
  ].some(token => value.includes(token));
}

/**
 * Fonction utilitaire pour vérifier l'accès à une équipe
 */
async function checkTeamAccess(userId, teamId, chatId) {
  const teamFilter = { _id: teamId };
  if (chatId) teamFilter.chatId = chatId;
  const team = await Team.findOne(teamFilter);
  if (!team) return false;
  
  return team.members.some(member => 
    member.userId.toString() === userId.toString()
  );
}


/**
 * GET /api/scores/:id
 * Récupérer un score par son ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const score = await Score.findOne(scoreInChatFilter(id, req.chatId))
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
                  (score.team && await checkTeamAccess(req.userId, score.team._id, req.chatId));

  if (!canView) {
    throw createError(403, 'Accès non autorisé à ce score');
  }

  res.json({ score });
}));

/**
 * PUT /api/scores/:id
 * Mettre à jour un score
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { value, maxPossible, status, comments, rejectionReason } = req.body;

  const score = await Score.findOne(scoreInChatFilter(id, req.chatId));
  if (!score) {
    throw createError(404, 'Score non trouvé');
  }

  // Vérifier les permissions
  const isAwarder = score.awardedBy.toString() === req.userId.toString();
  const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
  const hasTeamPermission = score.team ? await checkTeamAccess(req.userId, score.team, req.chatId) : false;

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

  const score = await Score.findOne(scoreInChatFilter(id, req.chatId));
  if (!score) {
    throw createError(404, 'Score non trouvé');
  }

  // Vérifier les permissions
  const isAwarder = score.awardedBy.toString() === req.userId.toString();
  const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
  const hasTeamPermission = score.team ? await checkTeamAccess(req.userId, score.team, req.chatId) : false;

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

  await Score.deleteOne(scoreInChatFilter(id, req.chatId));

  logger.info(`Score supprimé`, {
    scoreId: score._id,
    deletedBy: req.user.username
  });

  res.json({
    message: 'Score supprimé avec succès',
  });
}));

/**
 * PUT /api/scores/:id/approve
 * Approuver un score
 */
router.put('/:id/approve', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { comments } = req.body;

  const score = await Score.findOne(scoreInChatFilter(id, req.chatId));
  if (!score) {
    throw createError(404, 'Score non trouvé');
  }

  const hasApprovalPermission = await canApproveScore(score, req.userId, req.user.role, req.chatId);
  if (!hasApprovalPermission) {
    throw createError(403, 'Permissions insuffisantes pour approuver ce score');
  }

  validateScoreApprovalStatus(score);
  applyScoreApproval(score, comments, req.userId);

  await score.save();

  await updateStatisticsOnApproval(score);

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

  validateRejectionReason(reason);

  const score = await Score.findOne(scoreInChatFilter(id, req.chatId));
  if (!score) {
    throw createError(404, 'Score non trouvé');
  }

  const hasRejectionPermission = await canRejectScore(score, req.userId, req.user.role, req.chatId);
  if (!hasRejectionPermission) {
    throw createError(403, 'Permissions insuffisantes pour rejeter ce score');
  }

  validateScoreRejectionStatus(score);

  const wasApproved = score.status === 'approved';
  applyScoreRejection(score, reason, comments, req.userId);

  await score.save();

  await rollbackStatisticsOnRejection(score, wasApproved);

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


export default router;
