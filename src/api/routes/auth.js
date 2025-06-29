import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';
import logger from '../../utils/logger.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Inscription d'un nouvel utilisateur
 */
router.post('/register', asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName } = req.body;

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
    password, // Le hachage est fait dans le middleware pre('save')
    firstName,
    lastName,
  });

  await user.save();

  // Générer le token JWT
  const token = jwt.sign(
    { userId: user._id, username: user.username },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  logger.info(`Nouvel utilisateur inscrit: ${username}`, { userId: user._id });

  res.status(201).json({
    message: 'Utilisateur créé avec succès',
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      stats: user.stats,
    },
  });
}));

/**
 * POST /api/auth/login
 * Connexion d'un utilisateur
 */
router.post('/login', asyncHandler(async (req, res) => {
  const { login, password } = req.body; // login peut être username ou email

  if (!login || !password) {
    throw createError(400, 'Login et password sont requis');
  }

  // Chercher l'utilisateur par email ou username
  const user = await User.findOne({
    $or: [{ email: login }, { username: login }]
  }).select('+password'); // Inclure le password pour la vérification

  if (!user) {
    throw createError(401, 'Identifiants invalides');
  }

  // Vérifier le statut du compte
  if (user.status !== 'active') {
    throw createError(401, 'Compte inactif ou suspendu');
  }

  // Vérifier le mot de passe
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw createError(401, 'Identifiants invalides');
  }

  // Mettre à jour les informations de connexion
  user.lastLogin = new Date();
  user.lastIp = req.ip;
  await user.save();

  // Générer le token JWT
  const token = jwt.sign(
    { userId: user._id, username: user.username },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  logger.info(`Utilisateur connecté: ${user.username}`, { userId: user._id });

  res.json({
    message: 'Connexion réussie',
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      stats: user.stats,
      teams: user.teams,
      settings: user.settings,
    },
  });
}));

/**
 * GET /api/auth/me
 * Récupérer les informations de l'utilisateur connecté
 */
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId)
    .populate('teams.team', 'name description')
    .select('-password');

  if (!user) {
    throw createError(404, 'Utilisateur non trouvé');
  }

  res.json({
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      role: user.role,
      stats: user.stats,
      teams: user.teams,
      settings: user.settings,
      telegram: user.telegram,
      emailVerified: user.emailVerified,
      lastLogin: user.lastLogin,
    },
  });
}));

/**
 * PUT /api/auth/profile
 * Mettre à jour le profil de l'utilisateur connecté
 */
router.put('/profile', authMiddleware, asyncHandler(async (req, res) => {
  const { firstName, lastName, avatar, settings } = req.body;
  
  const user = await User.findById(req.userId);
  if (!user) {
    throw createError(404, 'Utilisateur non trouvé');
  }

  // Mettre à jour les champs autorisés
  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (avatar !== undefined) user.avatar = avatar;
  if (settings !== undefined) {
    user.settings = { ...user.settings, ...settings };
  }

  await user.save();

  logger.info(`Profil mis à jour: ${user.username}`, { userId: user._id });

  res.json({
    message: 'Profil mis à jour avec succès',
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      settings: user.settings,
    },
  });
}));

/**
 * POST /api/auth/change-password
 * Changer le mot de passe de l'utilisateur connecté
 */
router.post('/change-password', authMiddleware, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw createError(400, 'Mot de passe actuel et nouveau mot de passe requis');
  }

  const user = await User.findById(req.userId).select('+password');
  if (!user) {
    throw createError(404, 'Utilisateur non trouvé');
  }

  // Vérifier le mot de passe actuel
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    throw createError(400, 'Mot de passe actuel incorrect');
  }

  // Mettre à jour le mot de passe
  user.password = newPassword; // Le hachage est fait dans le middleware pre('save')
  await user.save();

  logger.info(`Mot de passe changé: ${user.username}`, { userId: user._id });

  res.json({
    message: 'Mot de passe changé avec succès',
  });
}));

/**
 * POST /api/auth/link-telegram
 * Lier un compte Telegram à l'utilisateur connecté
 */
router.post('/link-telegram', authMiddleware, asyncHandler(async (req, res) => {
  const { telegramId, telegramUsername, chatId } = req.body;

  if (!telegramId) {
    throw createError(400, 'ID Telegram requis');
  }

  const user = await User.findById(req.userId);
  if (!user) {
    throw createError(404, 'Utilisateur non trouvé');
  }

  // Vérifier si ce Telegram ID n'est pas déjà utilisé
  const existingUser = await User.findOne({ 'telegram.id': telegramId });
  if (existingUser && existingUser._id.toString() !== user._id.toString()) {
    throw createError(409, 'Ce compte Telegram est déjà lié à un autre utilisateur');
  }

  // Lier le compte Telegram
  user.telegram = {
    id: telegramId,
    username: telegramUsername,
    chatId: chatId,
  };

  await user.save();

  logger.info(`Compte Telegram lié: ${user.username}`, { 
    userId: user._id, 
    telegramId, 
    telegramUsername 
  });

  res.json({
    message: 'Compte Telegram lié avec succès',
    telegram: user.telegram,
  });
}));

/**
 * DELETE /api/auth/unlink-telegram
 * Délier le compte Telegram de l'utilisateur connecté
 */
router.delete('/unlink-telegram', authMiddleware, asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    throw createError(404, 'Utilisateur non trouvé');
  }

  if (!user.telegram?.id) {
    throw createError(400, 'Aucun compte Telegram lié');
  }

  // Délier le compte Telegram
  user.telegram = {
    id: undefined,
    username: undefined,
    chatId: undefined,
  };

  await user.save();

  logger.info(`Compte Telegram délié: ${user.username}`, { userId: user._id });

  res.json({
    message: 'Compte Telegram délié avec succès',
  });
}));

export default router;