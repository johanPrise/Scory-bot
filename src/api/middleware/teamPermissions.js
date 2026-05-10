import User from '../models/User.js';
import { createError } from './errorHandler.js';

const TEAM_PERMISSIONS = {
  owner: ['manage_team', 'manage_members', 'manage_roles', 'manage_activities', 'view_stats'],
  admin: ['manage_members', 'manage_activities', 'view_stats'],
  member: ['view_stats'],
};

const getTeamIdParam = (req) => req.params.teamId ?? req.params.id;

const isGlobalAdmin = (user) => {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'superadmin';
};

const findTeamMembership = (user, teamId) => {
  if (!user?.teams) return null;

  const teamIdStr = String(teamId);
  return user.teams.find(t => t.team != null && String(t.team) === teamIdStr);
};

const hasTeamPermission = (role, permission) => {
  if (typeof role !== 'string' || typeof permission !== 'string') return false;
  return TEAM_PERMISSIONS[role]?.includes(permission) ?? false;
};

/**
 * Middleware de vérification de propriété d'équipe
 */
export const requireTeamPermission = (permission) => {
  return async (req, res, next) => {
    try {
      const teamId = getTeamIdParam(req);
      if (!teamId) {
        return next(createError(400, 'ID d\'équipe manquant'));
      }

      const user = await User.findById(req.userId);
      if (isGlobalAdmin(user)) {
        return next();
      }

      const teamMembership = findTeamMembership(user, teamId);
      if (!teamMembership) {
        return next(createError(403, 'Vous n\'êtes pas membre de cette équipe'));
      }

      if (!hasTeamPermission(teamMembership.role, permission)) {
        return next(createError(403, 'Permissions insuffisantes dans cette équipe'));
      }

      req.teamRole = teamMembership.role;
      next();
    } catch (error) {
      next(error);
    }
  };
};
