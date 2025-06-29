import express from 'express';
import User from '../models/User.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import logger from '../../utils/logger.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

/**
 * GET /api/users
 * Récupérer la liste des utilisateurs (admin seulement)
 */
router.get('/', requireRole('admin', 'superadmin'), asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    role,
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Construction du filtre de recherche
  const filter = {};
  
  if (search) {
    filter.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (role) filter.role = role;
  if (status) filter.status = status;

  // Options de pagination et tri
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
    select: '-password',
    populate: {
      path: 'teams.team',
      select: 'name description'
    }
  };

  const result = await User.paginate(filter, options);

  res.json({
    users: result.docs,
    pagination: {
      currentPage: result.page,
      totalPages: result.totalPages,
      totalUsers: result.totalDocs,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
    }
  });
}));

/**
 * GET /api/users/:id
 * Récupérer un utilisateur par son ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requestingUser = req.user;

  // Vérifier les permissions
  if (id !== requestingUser._id.toString() && 
      !['admin', 'superadmin'].includes(requestingUser.role)) {
    throw createError(403, 'Permissions insuffisantes');
  }

  const user = await User.findById(id)
    .populate('teams.team', 'name description stats')
    .select('-password');

  if (!user) {
    throw createError(404, 'Utilisateur non trouvé');
  }

  res.json({ user });
}));

/**
 * POST /api/users
 * Créer un nouvel utilisateur (admin seulement)
 */
router.post('/', requireRole('admin', 'superadmin'), asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName, role = 'user' } = req.body;

  // Validation des champs requis
  if (!username || !email || !password) {
    throw createError(400, 'Username, email et password sont requis');
  }

  // Vérifier si l'utilisateur existe déjà
  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  });

  if (existingUser) {
    throw createError(409, 'Un utilisateur avec cet email ou username existe déjà');
  }

  // Créer le nouvel utilisateur
  const user = new User({
    username,
    email,
    password,
    firstName,
    lastName,
    role,
    emailVerified: true, // Les admins peuvent créer des comptes pré-vérifiés
  });

  await user.save();

  logger.info(`Utilisateur créé par admin: ${username}`, { 
    createdBy: req.user.username,
    userId: user._id 
  });

  res.status(201).json({
    message: 'Utilisateur créé avec succès',
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
    },
  });
}));

/**
 * PUT /api/users/:id
 * Mettre à jour un utilisateur
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requestingUser = req.user;
  const updates = req.body;

  // Vérifier les permissions
  const canEdit = id === requestingUser._id.toString() || 
                  ['admin', 'superadmin'].includes(requestingUser.role);
  
  if (!canEdit) {
    throw createError(403, 'Permissions insuffisantes');
  }

  const user = await User.findById(id);
  if (!user) {
    throw createError(404, 'Utilisateur non trouvé');
  }

  // Champs que l'utilisateur peut modifier sur son propre profil
  const userEditableFields = ['firstName', 'lastName', 'avatar', 'settings'];
  
  // Champs que seuls les admins peuvent modifier
  const adminOnlyFields = ['role', 'status', 'emailVerified'];

  // Filtrer les mises à jour selon les permissions
  const allowedUpdates = {};
  
  for (const [key, value] of Object.entries(updates)) {
    if (userEditableFields.includes(key)) {
      allowedUpdates[key] = value;
    } else if (adminOnlyFields.includes(key) && ['admin', 'superadmin'].includes(requestingUser.role)) {
      allowedUpdates[key] = value;
    } else if (!adminOnlyFields.includes(key) && !userEditableFields.includes(key)) {
      throw createError(400, `Champ non modifiable: ${key}`);
    }
  }

  // Appliquer les mises à jour
  Object.assign(user, allowedUpdates);
  await user.save();

  logger.info(`Utilisateur mis à jour: ${user.username}`, { 
    updatedBy: requestingUser.username,
    userId: user._id,
    fields: Object.keys(allowedUpdates)
  });

  res.json({
    message: 'Utilisateur mis à jour avec succès',
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      stats: user.stats,
    },
  });
}));

/**
 * DELETE /api/users/:id
 * Supprimer un utilisateur (admin seulement)
 */
router.delete('/:id', requireRole('admin', 'superadmin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requestingUser = req.user;

  // Empêcher l'auto-suppression
  if (id === requestingUser._id.toString()) {
    throw createError(400, 'Vous ne pouvez pas supprimer votre propre compte');
  }

  const user = await User.findById(id);
  if (!user) {
    throw createError(404, 'Utilisateur non trouvé');
  }

  // Marquer comme supprimé au lieu de supprimer définitivement
  user.status = 'deleted';
  user.email = `deleted_${Date.now()}_${user.email}`;
  user.username = `deleted_${Date.now()}_${user.username}`;
  await user.save();

  logger.info(`Utilisateur supprimé: ${user.username}`, { 
    deletedBy: requestingUser.username,
    userId: user._id 
  });

  res.json({
    message: 'Utilisateur supprimé avec succès',
  });
}));

/**
 * GET /api/users/:id/stats
 * Récupérer les statistiques d'un utilisateur
 */
router.get('/:id/stats', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const requestingUser = req.user;

  // Vérifier les permissions
  if (id !== requestingUser._id.toString() && 
      !['admin', 'superadmin'].includes(requestingUser.role)) {
    throw createError(403, 'Permissions insuffisantes');
  }

  const user = await User.findById(id).select('stats teams');
  if (!user) {
    throw createError(404, 'Utilisateur non trouvé');
  }

  // Calculer des statistiques supplémentaires
  const teamCount = user.teams.length;
  const adminTeamCount = user.teams.filter(t => ['admin', 'owner'].includes(t.role)).length;

  res.json({
    stats: {
      ...user.stats.toObject(),
      teamCount,
      adminTeamCount,
    }
  });
}));

/**
 * POST /api/users/:id/teams/:teamId
 * Ajouter un utilisateur à une équipe
 */
router.post('/:id/teams/:teamId', requireRole('admin', 'superadmin'), asyncHandler(async (req, res) => {
  const { id, teamId } = req.params;
  const { role = 'member' } = req.body;

  const user = await User.findById(id);
  if (!user) {
    throw createError(404, 'Utilisateur non trouvé');
  }

  await user.addToTeam(teamId, role);

  logger.info(`Utilisateur ajouté à l'équipe`, { 
    userId: id,
    teamId,
    role,
    addedBy: req.user.username
  });

  res.json({
    message: 'Utilisateur ajouté à l\'équipe avec succès',
  });
}));

/**
 * DELETE /api/users/:id/teams/:teamId
 * Retirer un utilisateur d'une équipe
 */
router.delete('/:id/teams/:teamId', requireRole('admin', 'superadmin'), asyncHandler(async (req, res) => {
  const { id, teamId } = req.params;

  const user = await User.findById(id);
  if (!user) {
    throw createError(404, 'Utilisateur non trouvé');
  }

  await user.removeFromTeam(teamId);

  logger.info(`Utilisateur retiré de l'équipe`, { 
    userId: id,
    teamId,
    removedBy: req.user.username
  });

  res.json({
    message: 'Utilisateur retiré de l\'équipe avec succès',
  });
}));

/**
 * POST /api/users/link-telegram
 * Lier un compte utilisateur à Telegram via un code
 */
router.post('/link-telegram', asyncHandler(async (req, res) => {
  const { code } = req.body;
  const user = req.user;
  if (!code) {
    throw createError(400, 'Code de liaison requis');
  }
  // Chercher un utilisateur temporaire avec ce code
  const tgUser = await User.findOne({ 'telegram.linkCode': code, 'telegram.linked': false });
  if (!tgUser || !tgUser.telegram || !tgUser.telegram.id) {
    throw createError(404, 'Code de liaison invalide ou expiré');
  }
  // Vérifier si ce Telegram est déjà lié à un autre compte
  const alreadyLinked = await User.findOne({ 'telegram.id': tgUser.telegram.id, 'telegram.linked': true });
  if (alreadyLinked) {
    throw createError(409, 'Ce compte Telegram est déjà lié à un autre utilisateur');
  }
  // Lier le compte : copier les infos Telegram
  user.telegram = {
    id: tgUser.telegram.id,
    username: tgUser.telegram.username,
    chatId: tgUser.telegram.chatId,
    linked: true
  };
  // Nettoyer le code de liaison
  user.telegram.linkCode = undefined;
  await user.save();
  // Désactiver le profil temporaire Telegram
  tgUser.status = 'inactive';
  tgUser.telegram.linked = false;
  tgUser.telegram.linkCode = undefined;
  await tgUser.save();
  res.json({ message: 'Compte Telegram lié avec succès' });
}));

/**
 * POST /api/users/unlink-telegram
 * Délier le compte Telegram de l'utilisateur connecté
 */
router.post('/unlink-telegram', asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user.telegram || !user.telegram.linked) {
    throw createError(400, 'Aucun compte Telegram lié à ce profil');
  }
  user.telegram = {
    linked: false
  };
  await user.save();
  res.json({ message: 'Compte Telegram délié avec succès' });
}));

export default router;