import express from 'express';
import Team from '../models/Team.js';
import User from '../models/User.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { authMiddleware, requireTeamPermission } from '../middleware/auth.js';
import logger from '../../utils/logger.js';
import { notifyUserAddedToTeam } from '../utils/notifications.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

/**
 * GET /api/teams
 * Récupérer la liste des équipes
 */
router.get('/', asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    chatId,
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

  // Options de pagination et tri
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
    populate: [
      { path: 'createdBy', select: 'username firstName lastName' },
      { path: 'members.userId', select: 'username firstName lastName avatar' }
    ]
  };

  const result = await Team.paginate(filter, options);

  res.json({
    teams: result.docs,
    pagination: {
      currentPage: result.page,
      totalPages: result.totalPages,
      totalTeams: result.totalDocs,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    }
  });
}));

/**
 * GET /api/teams/:id
 * Récupérer une équipe par son ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { includeMembers = 'true', includeStats = 'true' } = req.query;

  const populateOptions = [
    { path: 'createdBy', select: 'username firstName lastName avatar' }
  ];

  if (includeMembers === 'true') {
    populateOptions.push({
      path: 'members.userId',
      select: 'username firstName lastName avatar stats'
    });
  }

  const team = await Team.findById(id).populate(populateOptions);

  if (!team) {
    throw createError(404, 'Équipe non trouvée');
  }

  // Vérifier si l'utilisateur a accès à cette équipe
  const userIsMember = team.members.some(member => 
    member.userId._id.toString() === req.userId.toString()
  );
  
  const userIsAdmin = ['admin', 'superadmin'].includes(req.user.role);

  if (!userIsMember && !userIsAdmin) {
    throw createError(403, 'Accès non autorisé à cette équipe');
  }

  let stats = {};
  if (includeStats === 'true') {
    // Calculer des statistiques supplémentaires
    stats = {
      ...team.stats.toObject(),
      memberCount: team.members.length,
      adminCount: team.members.filter(m => m.isAdmin).length,
    };
  }

  res.json({
    team: {
      ...team.toObject(),
      stats: includeStats === 'true' ? stats : undefined
    }
  });
}));

/**
 * POST /api/teams
 * Créer une nouvelle équipe
 */
router.post('/', asyncHandler(async (req, res) => {
  const { name, description, chatId, settings = {} } = req.body;
  const createdBy = req.userId;

  // Validation des champs requis
  if (!name) {
    throw createError(400, 'Le nom de l\'équipe est requis');
  }

  // Utiliser chatId fourni ou générer un identifiant webapp
  const effectiveChatId = chatId || `webapp_${req.userId}`;

  // Vérifier si une équipe avec ce nom existe déjà
  const existingTeam = chatId 
    ? await Team.findOne({ name, chatId }) 
    : await Team.findOne({ name, createdBy });
  if (existingTeam) {
    throw createError(409, 'Une équipe avec ce nom existe déjà');
  }

  // Créer l'équipe
  const team = new Team({
    name,
    description,
    chatId: effectiveChatId,
    createdBy,
    settings: {
      maxMembers: 10,
      isPrivate: false,
      ...settings
    },
    members: [{
      userId: createdBy,
      username: req.user.username,
      isAdmin: true,
      joinedAt: new Date()
    }]
  });

  await team.save();

  // Ajouter l'équipe à l'utilisateur
  await req.user.addToTeam(team._id, 'owner');

  logger.info(`Équipe créée: ${name}`, { 
    teamId: team._id,
    createdBy: req.user.username,
    chatId: effectiveChatId
  });

  res.status(201).json({
    message: 'Équipe créée avec succès',
    team: {
      id: team._id,
      name: team.name,
      description: team.description,
      chatId: team.chatId,
      joinCode: team.settings.joinCode,
      settings: team.settings,
      stats: team.stats,
    },
  });
}));

/**
 * POST /api/teams/join
 * Rejoindre une équipe avec un code d'invitation
 */
router.post('/join', asyncHandler(async (req, res) => {
  const { joinCode } = req.body;
  const userId = req.userId;

  if (!joinCode) {
    throw createError(400, 'Code d\'invitation requis');
  }

  // Chercher l'équipe par code
  const team = await Team.findOne({ 'settings.joinCode': joinCode.toUpperCase() });
  if (!team) {
    throw createError(404, 'Code d\'invitation invalide ou équipe introuvable');
  }

  // Vérifier si l'utilisateur est déjà membre
  const isMember = team.members.some(m => m.userId.toString() === userId.toString());
  if (isMember) {
    throw createError(409, 'Vous êtes déjà membre de cette équipe');
  }

  // Vérifier la limite de membres
  if (team.members.length >= team.settings.maxMembers) {
    throw createError(400, 'L\'équipe a atteint sa capacité maximale');
  }

  // Ajouter le membre
  await team.addMember(userId, req.user.username, false);
  await req.user.addToTeam(team._id, 'member');

  logger.info(`Utilisateur a rejoint l'équipe`, {
    teamId: team._id,
    teamName: team.name,
    userId,
    username: req.user.username
  });

  res.json({
    message: `Vous avez rejoint l'équipe "${team.name}"`,
    team: {
      id: team._id,
      name: team.name,
      description: team.description,
      memberCount: team.members.length + 1,
    }
  });
}));

/**
 * PUT /api/teams/:id
 * Mettre à jour une équipe
 */
router.put('/:id', requireTeamPermission('manage_team'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, settings } = req.body;

  const team = await Team.findById(id);
  if (!team) {
    throw createError(404, 'Équipe non trouvée');
  }

  // Mettre à jour les champs autorisés
  if (name !== undefined) {
    // Vérifier l'unicité du nom dans le chat
    const existingTeam = await Team.findOne({ 
      name, 
      chatId: team.chatId, 
      _id: { $ne: id } 
    });
    if (existingTeam) {
      throw createError(409, 'Une équipe avec ce nom existe déjà dans ce chat');
    }
    team.name = name;
  }
  
  if (description !== undefined) team.description = description;
  if (settings !== undefined) {
    team.settings = { ...team.settings, ...settings };
  }

  await team.save();

  logger.info(`Équipe mise à jour: ${team.name}`, { 
    teamId: team._id,
    updatedBy: req.user.username
  });

  res.json({
    message: 'Équipe mise à jour avec succès',
    team: {
      id: team._id,
      name: team.name,
      description: team.description,
      settings: team.settings,
    },
  });
}));

/**
 * DELETE /api/teams/:id
 * Supprimer une équipe
 */
router.delete('/:id', requireTeamPermission('manage_team'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const team = await Team.findById(id);
  if (!team) {
    throw createError(404, 'Équipe non trouvée');
  }

  // Vérifier que l'utilisateur est le propriétaire
  if (team.createdBy.toString() !== req.userId.toString() && 
      !['admin', 'superadmin'].includes(req.user.role)) {
    throw createError(403, 'Seul le créateur de l\'équipe peut la supprimer');
  }

  // Retirer tous les membres de leurs équipes
  for (const member of team.members) {
    const user = await User.findById(member.userId);
    if (user) {
      await user.removeFromTeam(team._id);
    }
  }

  await Team.findByIdAndDelete(id);

  logger.info(`Équipe supprimée: ${team.name}`, { 
    teamId: team._id,
    deletedBy: req.user.username
  });

  res.json({
    message: 'Équipe supprimée avec succès',
  });
}));

/**
 * GET /api/teams/:id/members
 * Récupérer les membres d'une équipe
 */
router.get('/:id/members', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 20, role } = req.query;

  const team = await Team.findById(id)
    .populate({
      path: 'members.userId',
      select: 'username firstName lastName avatar stats'
    });

  if (!team) {
    throw createError(404, 'Équipe non trouvée');
  }

  // Vérifier l'accès
  const userIsMember = team.members.some(member => 
    member.userId._id.toString() === req.userId.toString()
  );
  
  if (!userIsMember && !['admin', 'superadmin'].includes(req.user.role)) {
    throw createError(403, 'Accès non autorisé');
  }

  // Filtrer par rôle si spécifié
  let members = team.members;
  if (role) {
    members = members.filter(member => 
      role === 'admin' ? member.isAdmin : !member.isAdmin
    );
  }

  // Pagination manuelle
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedMembers = members.slice(startIndex, endIndex);

  res.json({
    members: paginatedMembers,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(members.length / limit),
      totalMembers: members.length,
      hasNextPage: endIndex < members.length,
      hasPrevPage: startIndex > 0,
    }
  });
}));

/**
 * POST /api/teams/:id/members
 * Ajouter un membre à une équipe
 */
router.post('/:id/members', requireTeamPermission('manage_members'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, username, isAdmin = false } = req.body;

  if (!userId && !username) {
    throw createError(400, 'userId ou username requis');
  }

  const team = await Team.findById(id);
  if (!team) {
    throw createError(404, 'Équipe non trouvée');
  }

  // Trouver l'utilisateur
  let user;
  if (userId) {
    user = await User.findById(userId);
  } else {
    user = await User.findOne({ username });
  }

  if (!user) {
    throw createError(404, 'Utilisateur non trouvé');
  }

  // Ajouter le membre à l'équipe
  await team.addMember(user._id, user.username, isAdmin);
  // Ajouter l'équipe à l'utilisateur
  await user.addToTeam(team._id, isAdmin ? 'admin' : 'member');

  // Notifier l'utilisateur ajouté
  await notifyUserAddedToTeam(req, user._id, team);

  logger.info(`Membre ajouté à l'équipe`, { 
    teamId: team._id,
    teamName: team.name,
    userId: user._id,
    username: user.username,
    addedBy: req.user.username
  });

  res.json({
    message: 'Membre ajouté avec succès',
    member: {
      userId: user._id,
      username: user.username,
      isAdmin,
      joinedAt: new Date()
    }
  });
}));

/**
 * PUT /api/teams/:id/members/:userId
 * Mettre à jour le rôle d'un membre
 */
router.put('/:id/members/:userId', requireTeamPermission('manage_roles'), asyncHandler(async (req, res) => {
  const { id, userId } = req.params;
  const { isAdmin } = req.body;

  const team = await Team.findById(id);
  if (!team) {
    throw createError(404, 'Équipe non trouvée');
  }

  const memberIndex = team.members.findIndex(member => 
    member.userId.toString() === userId
  );

  if (memberIndex === -1) {
    throw createError(404, 'Membre non trouvé dans cette équipe');
  }

  // Mettre à jour le rôle dans l'équipe
  team.members[memberIndex].isAdmin = isAdmin;
  await team.save();

  // Mettre à jour le rôle dans l'utilisateur
  const user = await User.findById(userId);
  if (user) {
    await user.addToTeam(team._id, isAdmin ? 'admin' : 'member');
  }

  logger.info(`Rôle de membre mis à jour`, { 
    teamId: team._id,
    userId,
    isAdmin,
    updatedBy: req.user.username
  });

  res.json({
    message: 'Rôle mis à jour avec succès',
  });
}));

/**
 * DELETE /api/teams/:id/members/:userId
 * Retirer un membre d'une équipe
 */
router.delete('/:id/members/:userId', requireTeamPermission('manage_members'), asyncHandler(async (req, res) => {
  const { id, userId } = req.params;

  const team = await Team.findById(id);
  if (!team) {
    throw createError(404, 'Équipe non trouvée');
  }

  // Empêcher de retirer le créateur
  if (team.createdBy.toString() === userId) {
    throw createError(400, 'Impossible de retirer le créateur de l\'équipe');
  }

  // Retirer le membre de l'équipe
  await team.removeMember(userId);

  // Retirer l'équipe de l'utilisateur
  const user = await User.findById(userId);
  if (user) {
    await user.removeFromTeam(team._id);
  }

  logger.info(`Membre retiré de l'équipe`, { 
    teamId: team._id,
    userId,
    removedBy: req.user.username
  });

  res.json({
    message: 'Membre retiré avec succès',
  });
}));

/**
 * GET /api/teams/:id/stats
 * Récupérer les statistiques d'une équipe
 */
router.get('/:id/stats', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { period = 'month' } = req.query;

  const team = await Team.findById(id);
  if (!team) {
    throw createError(404, 'Équipe non trouvée');
  }

  // Vérifier l'accès
  const userIsMember = team.members.some(member => 
    member.userId.toString() === req.userId.toString()
  );
  
  if (!userIsMember && !['admin', 'superadmin'].includes(req.user.role)) {
    throw createError(403, 'Accès non autorisé');
  }

  // Calculer les statistiques
  const stats = {
    ...team.stats.toObject(),
    memberCount: team.members.length,
    adminCount: team.members.filter(m => m.isAdmin).length,
    activitiesCount: team.activities.length,
  };

  res.json({ stats });
}));

export default router;