import express from 'express';
import { Activity } from '../models/activity.js';
import Team from '../models/Team.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { authMiddleware, requireTeamPermission } from '../middleware/auth.js';
import logger from '../../utils/logger.js';
import { bot } from '../../config/bot.js'; // Import du bot Telegram
import User from '../models/User.js';
import { notifyActivityMembers, notifyActivityMembersSubActivity } from '../utils/notifications.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

/**
 * GET /api/activities
 * Récupérer la liste des activités
 */
router.get('/', asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    chatId,
    teamId,
    isActive,
    includeSubActivities = 'false',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Construction du filtre
  const filter = {};
  
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (chatId) filter.chatId = chatId;
  if (teamId) filter.teamId = teamId;
  if (isActive !== undefined) filter['settings.isActive'] = isActive === 'true';

  // Si aucun filtre chatId/teamId n'est fourni (webapp), montrer les activités
  // créées par l'utilisateur ou celles de ses équipes
  if (!chatId && !teamId && !search) {
    const userTeams = await Team.find({ 'members.userId': req.userId }).select('_id');
    const teamIds = userTeams.map(t => t._id);
    filter.$or = [
      { createdBy: req.userId },
      ...(teamIds.length > 0 ? [{ teamId: { $in: teamIds } }] : [])
    ];
  }

  // Options de pagination et tri
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
    populate: [
      { path: 'createdBy', select: 'username firstName lastName' },
      { path: 'teamId', select: 'name description' }
    ]
  };

  const result = await Activity.paginate(filter, options);

  // Filtrer les sous-activités si demandé
  const activities = result.docs.map(activity => {
    const activityObj = activity.toObject();
    if (includeSubActivities === 'false') {
      delete activityObj.subActivities;
    }
    return activityObj;
  });

  res.json({
    activities,
    pagination: {
      currentPage: result.page,
      totalPages: result.totalPages,
      totalActivities: result.totalDocs,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    }
  });
}));

/**
 * GET /api/activities/:id
 * Récupérer une activité par son ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { includeSubActivities = 'true' } = req.query;

  const activity = await Activity.findById(id)
    .populate('createdBy', 'username firstName lastName')
    .populate('teamId', 'name description members');

  if (!activity) {
    throw createError(404, 'Activité non trouvée');
  }

  // Vérifier l'accès si l'activité est liée à une équipe
  if (activity.teamId) {
    const userIsMember = activity.teamId.members.some(member => 
      member.userId.toString() === req.userId.toString()
    );
    
    if (!userIsMember && !['admin', 'superadmin'].includes(req.user.role)) {
      throw createError(403, 'Accès non autorisé à cette activité');
    }
  }

  const activityObj = activity.toObject();
  if (includeSubActivities === 'false') {
    delete activityObj.subActivities;
  }

  res.json({ activity: activityObj });
}));

/**
 * POST /api/activities
 * Créer une nouvelle activité
 */
router.post('/', asyncHandler(async (req, res) => {
  const { 
    name, 
    description, 
    type,
    chatId, 
    teamId, 
    settings = {} 
  } = req.body;
  const createdBy = req.userId;

  // Validation des champs requis
  if (!name) {
    throw createError(400, 'Le nom de l\'activité est requis');
  }

  // Utiliser chatId fourni ou générer un identifiant webapp
  const effectiveChatId = chatId || `webapp_${req.userId}`;

  // Si teamId est fourni, vérifier que l'utilisateur a les permissions
  if (teamId) {
    const team = await Team.findById(teamId);
    if (!team) {
      throw createError(404, 'Équipe non trouvée');
    }

    const userIsMember = team.members.some(member => 
      member.userId.toString() === req.userId.toString() && member.isAdmin
    );
    
    if (!userIsMember && !['admin', 'superadmin'].includes(req.user.role)) {
      throw createError(403, 'Permissions insuffisantes pour créer une activité dans cette équipe');
    }
  }

  // Créer l'activité
  const activity = new Activity({
    name,
    description,
    type: type || 'other',
    chatId: effectiveChatId,
    createdBy,
    teamId: teamId || undefined,
    settings: {
      isActive: true,
      startDate: new Date(),
      isRecurring: false,
      maxParticipants: 50,
      ...settings
    }
  });

  await activity.save();

  // Ajouter l'activité à l'équipe si applicable
  if (teamId) {
    const team = await Team.findById(teamId);
    team.activities.push(activity._id);
    await team.save();
  }

  logger.info(`Activité créée: ${name}`, { 
    activityId: activity._id,
    createdBy: req.user.username,
    chatId: effectiveChatId,
    teamId 
  });

  // Notifier les membres/admins
  await notifyActivityMembers(req, activity, 'created');

  res.status(201).json({
    message: 'Activité créée avec succès',
    activity: {
      id: activity._id,
      name: activity.name,
      description: activity.description,
      chatId: activity.chatId,
      teamId: activity.teamId,
      settings: activity.settings,
      stats: activity.stats,
    },
  });
}));

/**
 * PUT /api/activities/:id
 * Mettre à jour une activité
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, settings } = req.body;

  const activity = await Activity.findById(id).populate('teamId');
  if (!activity) {
    throw createError(404, 'Activité non trouvée');
  }

  // Vérifier les permissions
  const isCreator = activity.createdBy.toString() === req.userId.toString();
  const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
  
  let hasTeamPermission = false;
  if (activity.teamId) {
    hasTeamPermission = activity.teamId.members.some(member => 
      member.userId.toString() === req.userId.toString() && member.isAdmin
    );
  }

  if (!isCreator && !isAdmin && !hasTeamPermission) {
    throw createError(403, 'Permissions insuffisantes');
  }

  // Mettre à jour les champs autorisés
  if (name !== undefined) activity.name = name;
  if (description !== undefined) activity.description = description;
  if (settings !== undefined) {
    activity.settings = { ...activity.settings, ...settings };
  }

  await activity.save();

  logger.info(`Activité mise à jour: ${activity.name}`, { 
    activityId: activity._id,
    updatedBy: req.user.username
  });

  // Notifier les membres/admins
  await notifyActivityMembers(req, activity, 'updated');

  res.json({
    message: 'Activité mise à jour avec succès',
    activity: {
      id: activity._id,
      name: activity.name,
      description: activity.description,
      settings: activity.settings,
    },
  });
}));

/**
 * DELETE /api/activities/:id
 * Supprimer une activité
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const activity = await Activity.findById(id).populate('teamId');
  if (!activity) {
    throw createError(404, 'Activité non trouvée');
  }

  // Vérifier les permissions
  const isCreator = activity.createdBy.toString() === req.userId.toString();
  const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
  
  let hasTeamPermission = false;
  if (activity.teamId) {
    hasTeamPermission = activity.teamId.members.some(member => 
      member.userId.toString() === req.userId.toString() && member.isAdmin
    );
  }

  if (!isCreator && !isAdmin && !hasTeamPermission) {
    throw createError(403, 'Permissions insuffisantes');
  }

  // Retirer l'activité de l'équipe si applicable
  if (activity.teamId) {
    const team = await Team.findById(activity.teamId._id);
    team.activities = team.activities.filter(actId => 
      actId.toString() !== activity._id.toString()
    );
    await team.save();
  }

  await Activity.findByIdAndDelete(String(id));

  logger.info(`Activité supprimée: ${activity.name}`, { 
    activityId: activity._id,
    deletedBy: req.user.username
  });

  // Notifier les membres/admins
  await notifyActivityMembers(req, activity, 'deleted');

  res.json({
    message: 'Activité supprimée avec succès',
  });
}));

/**
 * POST /api/activities/:id/subactivities
 * Ajouter une sous-activité
 */
router.post('/:id/subactivities', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, maxScore = 100 } = req.body;

  if (!name) {
    throw createError(400, 'Nom de la sous-activité requis');
  }

  const activity = await Activity.findById(id).populate('teamId');
  if (!activity) {
    throw createError(404, 'Activité non trouvée');
  }

  // Vérifier les permissions
  const isCreator = activity.createdBy.toString() === req.userId.toString();
  const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
  
  let hasTeamPermission = false;
  if (activity.teamId) {
    hasTeamPermission = activity.teamId.members.some(member => 
      member.userId.toString() === req.userId.toString() && member.isAdmin
    );
  }

  if (!isCreator && !isAdmin && !hasTeamPermission) {
    throw createError(403, 'Permissions insuffisantes');
  }

  // Vérifier que la sous-activité n'existe pas déjà
  const existingSubActivity = activity.subActivities.find(sub => sub.name === name);
  if (existingSubActivity) {
    throw createError(409, 'Une sous-activité avec ce nom existe déjà');
  }

  // Ajouter la sous-activité
  activity.subActivities.push({
    name,
    description,
    maxScore,
    createdAt: new Date()
  });

  await activity.save();

  logger.info(`Sous-activité ajoutée: ${name}`, { 
    activityId: activity._id,
    activityName: activity.name,
    createdBy: req.user.username
  });

  // Notifier les membres/admins
  const subActivity = activity.subActivities[activity.subActivities.length - 1];
  await notifyActivityMembersSubActivity(req, activity, 'created', subActivity);

  res.status(201).json({
    message: 'Sous-activité ajoutée avec succès',
    subActivity: {
      name,
      description,
      maxScore,
      createdAt: new Date()
    }
  });
}));

/**
 * PUT /api/activities/:id/subactivities/:subId
 * Mettre à jour une sous-activité
 */
router.put('/:id/subactivities/:subId', asyncHandler(async (req, res) => {
  const { id, subId } = req.params;
  const { name, description, maxScore } = req.body;

  const activity = await Activity.findById(id).populate('teamId');
  if (!activity) {
    throw createError(404, 'Activité non trouvée');
  }

  // Vérifier les permissions
  const isCreator = activity.createdBy.toString() === req.userId.toString();
  const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
  
  let hasTeamPermission = false;
  if (activity.teamId) {
    hasTeamPermission = activity.teamId.members.some(member => 
      member.userId.toString() === req.userId.toString() && member.isAdmin
    );
  }

  if (!isCreator && !isAdmin && !hasTeamPermission) {
    throw createError(403, 'Permissions insuffisantes');
  }

  // Trouver la sous-activité
  const subActivity = activity.subActivities.id(subId);
  if (!subActivity) {
    throw createError(404, 'Sous-activité non trouvée');
  }

  // Mettre à jour les champs
  if (name !== undefined) subActivity.name = name;
  if (description !== undefined) subActivity.description = description;
  if (maxScore !== undefined) subActivity.maxScore = maxScore;

  await activity.save();

  logger.info(`Sous-activité mise à jour: ${subActivity.name}`, { 
    activityId: activity._id,
    subActivityId: subId,
    updatedBy: req.user.username
  });

  // Notifier les membres/admins
  await notifyActivityMembersSubActivity(req, activity, 'updated', subActivity);

  res.json({
    message: 'Sous-activité mise à jour avec succès',
    subActivity: {
      id: subActivity._id,
      name: subActivity.name,
      description: subActivity.description,
      maxScore: subActivity.maxScore,
    }
  });
}));

/**
 * DELETE /api/activities/:id/subactivities/:subId
 * Supprimer une sous-activité
 */
router.delete('/:id/subactivities/:subId', asyncHandler(async (req, res) => {
  const { id, subId } = req.params;

  const activity = await Activity.findById(id).populate('teamId');
  if (!activity) {
    throw createError(404, 'Activité non trouvée');
  }

  // Vérifier les permissions
  const isCreator = activity.createdBy.toString() === req.userId.toString();
  const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
  
  let hasTeamPermission = false;
  if (activity.teamId) {
    hasTeamPermission = activity.teamId.members.some(member => 
      member.userId.toString() === req.userId.toString() && member.isAdmin
    );
  }

  if (!isCreator && !isAdmin && !hasTeamPermission) {
    throw createError(403, 'Permissions insuffisantes');
  }

  // Supprimer la sous-activité
  const subActivity = activity.subActivities.id(subId);
  activity.subActivities.pull(subId);
  await activity.save();

  // Notifier les membres/admins
  await notifyActivityMembersSubActivity(req, activity, 'deleted', subActivity);

  logger.info(`Sous-activité supprimée: ${subActivity.name}`, { 
    activityId: activity._id,
    subActivityId: subId,
    deletedBy: req.user.username
  });

  res.json({
    message: 'Sous-activité supprimée avec succès',
  });
}));

/**
 * GET /api/activities/:id/history
 * Récupérer l'historique d'une activité
 */
router.get('/:id/history', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { 
    page = 1, 
    limit = 20, 
    userId, 
    period = 'month' 
  } = req.query;

  const activity = await Activity.findById(id);
  if (!activity) {
    throw createError(404, 'Activité non trouvée');
  }

  // Construire le filtre pour l'historique
  const filter = { activity: id };
  
  if (userId) filter.user = userId;
  
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

  // Récupérer les scores liés à cette activité
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const Score = (await import('../models/Score.js')).default;
  
  const [scores, totalEntries] = await Promise.all([
    Score.find(filter)
      .populate('user', 'username firstName lastName')
      .populate('team', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Score.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(totalEntries / parseInt(limit));

  res.json({
    history: scores.map(s => ({
      id: s._id,
      user: s.user,
      team: s.team,
      value: s.value,
      maxPossible: s.maxPossible,
      normalizedScore: s.normalizedScore,
      subActivity: s.subActivity,
      status: s.status,
      comments: s.metadata?.comments,
      createdAt: s.createdAt
    })),
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalEntries,
      hasNextPage: parseInt(page) < totalPages,
      hasPrevPage: parseInt(page) > 1,
    }
  });
}));

export default router;