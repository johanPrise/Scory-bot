import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { createError } from './errorHandler.js';
import logger from '../../utils/logger.js';

/**
 * Valide les données initData de Telegram WebApp et retourne l'utilisateur Telegram
 */
function validateTelegramInitData(initData) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return null;

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');
    const dataCheckArr = [];
    for (const [key, value] of params.entries()) {
      dataCheckArr.push(`${key}=${value}`);
    }
    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (computedHash !== hash) return null;

    const userString = params.get('user');
    if (!userString) return null;

    return JSON.parse(userString);
  } catch (err) {
    return null;
  }
}

/**
 * Middleware d'authentification JWT (avec fallback Telegram initData)
 */
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const telegramInitData = req.headers['x-telegram-init-data'];
    
    // 1. Essayer d'abord le JWT Bearer token
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (user && user.status === 'active') {
          req.user = user;
          req.userId = user._id;
          return next();
        }
      }
    }

    // 2. Fallback : authentification via Telegram initData
    if (telegramInitData) {
      const telegramUser = validateTelegramInitData(telegramInitData);
      
      if (telegramUser) {
        const user = await User.findOne({ 'telegram.id': String(telegramUser.id) }).select('-password');
        
        if (user && user.status === 'active') {
          req.user = user;
          req.userId = user._id;
          return next();
        }
      }
    }

    throw createError(401, 'Token d\'authentification manquant ou invalide');
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(createError(401, 'Token invalide'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(createError(401, 'Token expiré'));
    }
    next(error);
  }
};

/**
 * Middleware de vérification des rôles
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError(401, 'Authentification requise'));
    }

    if (!roles.includes(req.user.role)) {
      return next(createError(403, 'Permissions insuffisantes'));
    }

    next();
  };
};

/**
 * Middleware de vérification de propriété d'équipe
 */
export const requireTeamPermission = (permission) => {
  return async (req, res, next) => {
    try {
      const { teamId } = req.params;
      const userId = req.userId;

      if (!teamId) {
        return next(createError(400, 'ID d\'équipe manquant'));
      }

      const user = await User.findById(userId);
      
      // Vérifier si l'utilisateur est admin global
      if (user.role === 'admin' || user.role === 'superadmin') {
        return next();
      }

      // Vérifier les permissions dans l'équipe
      const teamMembership = user.teams.find(t => 
        t.team && t.team.toString() === teamId
      );

      if (!teamMembership) {
        return next(createError(403, 'Vous n\'êtes pas membre de cette équipe'));
      }

      // Vérifier les permissions selon le rôle
      const hasPermission = checkTeamPermission(teamMembership.role, permission);
      
      if (!hasPermission) {
        return next(createError(403, 'Permissions insuffisantes dans cette équipe'));
      }

      req.teamRole = teamMembership.role;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Vérifie si un rôle d'équipe a une permission spécifique
 */
const checkTeamPermission = (role, permission) => {
  const permissions = {
    owner: ['manage_team', 'manage_members', 'manage_roles', 'manage_activities', 'view_stats'],
    admin: ['manage_members', 'manage_activities', 'view_stats'],
    member: ['view_stats'],
  };

  return permissions[role]?.includes(permission) || false;
};

/**
 * Middleware optionnel d'authentification
 * N'échoue pas si pas de token, mais ajoute l'utilisateur si token valide
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (user && user.status === 'active') {
      req.user = user;
      req.userId = user._id;
    }
    
    next();
  } catch (error) {
    // En cas d'erreur, on continue sans utilisateur
    logger.warn('Erreur lors de l\'authentification optionnelle:', error.message);
    next();
  }
};