// src/services/teamService.js
import { fetchAPI } from './apiService.js';
import logger from '../utils/logger.js';

// Rôles des membres de l'équipe
export const TEAM_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  PENDING: 'pending'
};

// Niveaux d'accès
export const TEAM_PERMISSIONS = {
  MANAGE_TEAM: 'manage_team',
  MANAGE_MEMBERS: 'manage_members',
  MANAGE_ROLES: 'manage_roles',
  MANAGE_ACTIVITIES: 'manage_activities',
  VIEW_STATS: 'view_stats',
  SEND_INVITES: 'send_invites'
};

// Mappage des rôles aux permissions
const ROLE_PERMISSIONS = {
  [TEAM_ROLES.OWNER]: Object.values(TEAM_PERMISSIONS),
  [TEAM_ROLES.ADMIN]: [
    TEAM_PERMISSIONS.MANAGE_MEMBERS,
    TEAM_PERMISSIONS.MANAGE_ACTIVITIES,
    TEAM_PERMISSIONS.VIEW_STATS,
    TEAM_PERMISSIONS.SEND_INVITES
  ],
  [TEAM_ROLES.MEMBER]: [
    TEAM_PERMISSIONS.VIEW_STATS
  ],
  [TEAM_ROLES.PENDING]: []
};

/**
 * Vérifie si un rôle a une permission spécifique
 * @param {string} role - Le rôle à vérifier
 * @param {string} permission - La permission requise
 * @returns {boolean} True si le rôle a la permission
 */
export const hasPermission = (role, permission) => {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
};

// Fonction utilitaire pour gérer les erreurs
const handleError = (error, customMessage) => {
  const errorDetails = {
    message: error.message,
    status: error.status,
    code: error.code,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  };
  
  logger.error(`${customMessage}: ${error.message}`, { 
    error: errorDetails,
    context: error.context 
  });
  
  const errorToThrow = new Error(customMessage);
  errorToThrow.originalError = error;
  errorToThrow.status = error.status || 500;
  throw errorToThrow;
};

/**
 * Crée une nouvelle équipe avec des paramètres avancés
 * @param {Object} params - Paramètres de l'équipe
 * @param {string} params.name - Nom de l'équipe
 * @param {string} [params.description] - Description de l'équipe
 * @param {string} params.createdBy - ID du créateur
 * @param {string} [params.chatId] - ID du chat associé
 * @param {string} [params.logoUrl] - URL du logo de l'équipe
 * @param {Object} [params.settings] - Paramètres de l'équipe
 * @param {string} [params.visibility='private'] - Visibilité de l'équipe (public/private)
 * @returns {Promise<Object>} L'équipe créée
 */
export const createTeam = async ({
  name,
  description = '',
  createdBy,
  chatId,
  logoUrl = '',
  settings = {},
  visibility = 'private'
}) => {
  try {
    logger.info(`Creating team: ${name}`, { createdBy, chatId });
    
    const defaultSettings = {
      joinRequests: false,
      defaultRole: TEAM_ROLES.MEMBER,
      memberLimit: 50,
      ...settings
    };
    
    const response = await fetchAPI('/teams', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description,
        createdBy,
        chatId,
        logoUrl,
        settings: defaultSettings,
        visibility,
        members: [{
          userId: createdBy,
          role: TEAM_ROLES.OWNER,
          joinedAt: new Date().toISOString()
        }]
      })
    });

    logger.info(`Team created: ${response.data.id}`, { 
      teamId: response.data.id,
      name,
      createdBy 
    });
    
    return response.data;
  } catch (error) {
    handleError({
      ...error,
      context: { teamName: name, createdBy }
    }, 'Failed to create team');
  }
};

/**
 * Gestion avancée des membres d'équipe
 */

export const teamMemberService = {
  /**
   * Ajoute un membre à une équipe avec un rôle spécifique
   * @param {Object} params - Paramètres d'ajout
   * @param {string} params.teamId - ID de l'équipe
   * @param {string} params.userId - ID de l'utilisateur à ajouter
   * @param {string} [params.role=TEAM_ROLES.MEMBER] - Rôle de l'utilisateur
   * @param {string} [params.invitedBy] - ID de l'utilisateur qui invite
   * @param {Object} [metadata] - Métadonnées supplémentaires
   * @returns {Promise<Object>} Membre ajouté
   */
  async addMember({
    teamId,
    userId,
    role = TEAM_ROLES.MEMBER,
    invitedBy,
    ...metadata
  }) {
    try {
      logger.info(`Adding member ${userId} to team ${teamId}`, { role, invitedBy });
      
      const response = await fetchAPI(`/teams/${teamId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          userId,
          role,
          invitedBy,
          joinedAt: new Date().toISOString(),
          ...metadata
        })
      });

      logger.info(`Member ${userId} added to team ${teamId}`, { role });
      return response.data;
    } catch (error) {
      handleError({
        ...error,
        context: { teamId, userId, role }
      }, 'Failed to add team member');
    }
  },

  /**
   * Met à jour le rôle d'un membre
   * @param {string} teamId - ID de l'équipe
   * @param {string} userId - ID du membre
   * @param {string} role - Nouveau rôle
   * @param {string} updatedBy - ID de l'utilisateur effectuant la mise à jour
   * @returns {Promise<Object>} Membre mis à jour
   */
  async updateMemberRole(teamId, userId, role, updatedBy) {
    try {
      if (!Object.values(TEAM_ROLES).includes(role)) {
        throw new Error('Invalid team role');
      }
      
      logger.info(`Updating role for member ${userId} in team ${teamId}`, { role, updatedBy });
      
      const response = await fetchAPI(`/teams/${teamId}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role, updatedBy })
      });

      logger.info(`Role updated for member ${userId} in team ${teamId}`, { role });
      return response.data;
    } catch (error) {
      handleError({
        ...error,
        context: { teamId, userId, role, updatedBy }
      }, 'Failed to update team member role');
    }
  },

  /**
   * Supprime un membre d'une équipe
   * @param {string} teamId - ID de l'équipe
   * @param {string} userId - ID du membre à supprimer
   * @param {string} removedBy - ID de l'utilisateur effectuant la suppression
   * @returns {Promise<boolean>} True si la suppression a réussi
   */
  async removeMember(teamId, userId, removedBy) {
    try {
      logger.info(`Removing member ${userId} from team ${teamId}`, { removedBy });
      
      await fetchAPI(`/teams/${teamId}/members/${userId}`, {
        method: 'DELETE',
        body: JSON.stringify({ removedBy })
      });

      logger.info(`Member ${userId} removed from team ${teamId}`);
      return true;
    } catch (error) {
      handleError({
        ...error,
        context: { teamId, userId, removedBy }
      }, 'Failed to remove team member');
    }
  },

  /**
   * Récupère les membres d'une équipe avec pagination
   * @param {string} teamId - ID de l'équipe
   * @param {Object} [options] - Options de pagination
   * @param {number} [options.limit=20] - Nombre de résultats par page
   * @param {number} [options.offset=0] - Décalage de pagination
   * @param {string} [options.role] - Filtrer par rôle
   * @returns {Promise<{members: Array, total: number}>} Liste des membres et nombre total
   */
  async listMembers(teamId, { limit = 20, offset = 0, role } = {}) {
    try {
      const params = new URLSearchParams({ limit, offset });
      if (role) params.append('role', role);
      
      logger.info(`Fetching members for team ${teamId}`, { limit, offset, role });
      
      const response = await fetchAPI(`/teams/${teamId}/members?${params}`);
      return response.data;
    } catch (error) {
      handleError({
        ...error,
        context: { teamId, limit, offset, role }
      }, 'Failed to list team members');
    }
  },

  /**
   * Vérifie si un utilisateur a une certaine permission dans une équipe
   * @param {string} teamId - ID de l'équipe
   * @param {string} userId - ID de l'utilisateur
   * @param {string} permission - Permission à vérifier
   * @returns {Promise<boolean>} True si l'utilisateur a la permission
   */
  async checkPermission(teamId, userId, permission) {
    try {
      const member = await this.getMember(teamId, userId);
      return hasPermission(member.role, permission);
    } catch (error) {
      return false;
    }
  },

  /**
   * Récupère les informations d'un membre spécifique
   * @param {string} teamId - ID de l'équipe
   * @param {string} userId - ID du membre
   * @returns {Promise<Object>} Informations du membre
   */
  async getMember(teamId, userId) {
    try {
      const response = await fetchAPI(`/teams/${teamId}/members/${userId}`);
      return response.data;
    } catch (error) {
      handleError({
        ...error,
        context: { teamId, userId }
      }, 'Failed to get team member');
    }
  }
};

/**
 * Service de statistiques et classement des équipes
 */

export const teamStatsService = {
  /**
   * Récupère le classement des équipes avec des options avancées
   * @param {Object} params - Paramètres de classement
   * @param {string} [params.teamId] - ID de l'équipe spécifique
   * @param {string} [params.activityId] - ID de l'activité pour le filtrage
   * @param {string} [params.period] - Période (day, week, month, year, all)
   * @param {number} [params.limit=10] - Nombre de résultats
   * @param {number} [params.offset=0] - Décalage de pagination
   * @returns {Promise<{rankings: Array, stats: Object}>} Classement et statistiques
   */
  async getTeamRanking({
    teamId,
    activityId,
    period = 'month',
    limit = 10,
    offset = 0
  } = {}) {
    try {
      const params = new URLSearchParams({
        period,
        limit,
        offset
      });
      
      if (teamId) params.append('teamId', teamId);
      if (activityId) params.append('activityId', activityId);
      
      logger.info('Fetching team ranking', { teamId, activityId, period });
      
      const response = await fetchAPI(`/teams/ranking?${params}`);
      return response.data;
    } catch (error) {
      handleError({
        ...error,
        context: { teamId, activityId, period }
      }, 'Failed to fetch team ranking');
    }
  },

  /**
   * Récupère les statistiques détaillées d'une équipe
   * @param {string} teamId - ID de l'équipe
   * @param {Object} [options] - Options de filtrage
   * @param {string} [options.startDate] - Date de début (ISO)
   * @param {string} [options.endDate] - Date de fin (ISO)
   * @param {string} [options.activityId] - ID de l'activité pour le filtrage
   * @returns {Promise<Object>} Statistiques de l'équipe
   */
  async getTeamStats(teamId, { startDate, endDate, activityId } = {}) {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (activityId) params.append('activityId', activityId);
      
      logger.info(`Fetching stats for team ${teamId}`, { startDate, endDate, activityId });
      
      const response = await fetchAPI(`/teams/${teamId}/stats?${params}`);
      return response.data;
    } catch (error) {
      handleError({
        ...error,
        context: { teamId, startDate, endDate, activityId }
      }, 'Failed to fetch team stats');
    }
  },

  /**
   * Récupère l'historique des activités d'une équipe
   * @param {string} teamId - ID de l'équipe
   * @param {Object} [options] - Options de filtrage et de pagination
   * @param {number} [options.limit=20] - Nombre de résultats
   * @param {number} [options.offset=0] - Décalage de pagination
   * @param {string} [options.activityId] - ID de l'activité pour le filtrage
   * @param {string} [options.memberId] - ID du membre pour le filtrage
   * @returns {Promise<{activities: Array, total: number}>} Historique des activités
   */
  async getActivityHistory(teamId, { 
    limit = 20, 
    offset = 0, 
    activityId, 
    memberId 
  } = {}) {
    try {
      const params = new URLSearchParams({ limit, offset });
      if (activityId) params.append('activityId', activityId);
      if (memberId) params.append('memberId', memberId);
      
      logger.info(`Fetching activity history for team ${teamId}`, { 
        limit, 
        offset, 
        activityId, 
        memberId 
      });
      
      const response = await fetchAPI(`/teams/${teamId}/activities?${params}`);
      return response.data;
    } catch (error) {
      handleError({
        ...error,
        context: { teamId, activityId, memberId }
      }, 'Failed to fetch team activity history');
    }
  }
};

/**
 * Service principal de gestion des équipes
 */

export const teamService = {
  /**
   * Récupère les informations détaillées d'une équipe
   * @param {string} teamId - ID de l'équipe
   * @param {Object} [options] - Options supplémentaires
   * @param {boolean} [options.includeMembers=false] - Inclure la liste des membres
   * @param {boolean} [options.includeStats=false] - Inclure les statistiques
   * @returns {Promise<Object>} Informations de l'équipe
   */
  async getTeam(teamId, { includeMembers = false, includeStats = false } = {}) {
    try {
      const params = new URLSearchParams();
      if (includeMembers) params.append('include', 'members');
      if (includeStats) params.append('include', 'stats');
      
      logger.info(`Fetching team ${teamId}`, { includeMembers, includeStats });
      
      const response = await fetchAPI(`/teams/${teamId}?${params}`);
      return response.data;
    } catch (error) {
      handleError({
        ...error,
        context: { teamId, includeMembers, includeStats }
      }, 'Failed to get team');
    }
  },

  /**
   * Liste les équipes avec des options de filtrage et de pagination
   * @param {Object} [filters] - Filtres de recherche
   * @param {string} [filters.search] - Terme de recherche
   * @param {string} [filters.visibility] - Visibilité (public/private)
   * @param {string} [filters.ownerId] - ID du propriétaire
   * @param {Object} [pagination] - Paramètres de pagination
   * @param {number} [pagination.limit=20] - Nombre de résultats par page
   * @param {number} [pagination.offset=0] - Décalage de pagination
   * @param {string} [sort] - Champ de tri
   * @param {string} [order=asc] - Ordre de tri (asc/desc)
   * @returns {Promise<{teams: Array, total: number}>} Liste des équipes et nombre total
   */
  async listTeams(
    filters = {},
    { limit = 20, offset = 0 } = {},
    sort = 'createdAt',
    order = 'desc'
  ) {
    try {
      const params = new URLSearchParams({
        limit,
        offset,
        sort,
        order,
        ...filters
      });
      
      logger.info('Listing teams', { filters, limit, offset, sort, order });
      
      const response = await fetchAPI(`/teams?${params}`);
      return {
        teams: response.data.items || [],
        total: response.data.total || 0
      };
    } catch (error) {
      handleError({
        ...error,
        context: { filters, limit, offset, sort, order }
      }, 'Failed to list teams');
    }
  },

  /**
   * Met à jour les informations d'une équipe
   * @param {string} teamId - ID de l'équipe
   * @param {Object} updates - Mises à jour à appliquer
   * @param {string} [updates.name] - Nouveau nom
   * @param {string} [updates.description] - Nouvelle description
   * @param {string} [updates.logoUrl] - Nouvelle URL du logo
   * @param {Object} [updates.settings] - Nouveaux paramètres
   * @param {string} [updatedBy] - ID de l'utilisateur effectuant la mise à jour
   * @returns {Promise<Object>} Équipe mise à jour
   */
  async updateTeam(teamId, updates, updatedBy) {
    try {
      logger.info(`Updating team ${teamId}`, { 
        updates: Object.keys(updates),
        updatedBy 
      });
      
      const response = await fetchAPI(`/teams/${teamId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...updates,
          updatedBy,
          updatedAt: new Date().toISOString()
        })
      });

      logger.info(`Team ${teamId} updated successfully`);
      return response.data;
    } catch (error) {
      handleError({
        ...error,
        context: { teamId, updates, updatedBy }
      }, 'Failed to update team');
    }
  },

  /**
   * Supprime une équipe
   * @param {string} teamId - ID de l'équipe à supprimer
   * @param {string} deletedBy - ID de l'utilisateur effectuant la suppression
   * @returns {Promise<boolean>} True si la suppression a réussi
   */
  async deleteTeam(teamId, deletedBy) {
    try {
      logger.info(`Deleting team ${teamId}`, { deletedBy });
      
      await fetchAPI(`/teams/${teamId}`, {
        method: 'DELETE',
        body: JSON.stringify({ deletedBy })
      });

      logger.info(`Team ${teamId} deleted successfully`);
      return true;
    } catch (error) {
      handleError({
        ...error,
        context: { teamId, deletedBy }
      }, 'Failed to delete team');
    }
  },

  /**
   * Transfère la propriété d'une équipe à un autre membre
   * @param {string} teamId - ID de l'équipe
   * @param {string} newOwnerId - ID du nouveau propriétaire
   * @param {string} transferredBy - ID de l'utilisateur effectuant le transfert
   * @returns {Promise<Object>} Équipe mise à jour
   */
  async transferOwnership(teamId, newOwnerId, transferredBy) {
    try {
      logger.info(`Transferring ownership of team ${teamId} to ${newOwnerId}`, { transferredBy });
      
      const response = await fetchAPI(`/teams/${teamId}/transfer-ownership`, {
        method: 'POST',
        body: JSON.stringify({ newOwnerId, transferredBy })
      });

      logger.info(`Ownership of team ${teamId} transferred to ${newOwnerId}`);
      return response.data;
    } catch (error) {
      handleError({
        ...error,
        context: { teamId, newOwnerId, transferredBy }
      }, 'Failed to transfer team ownership');
    }
  },

  /**
   * Recherche des équipes avec des critères avancés
   * @param {string} query - Terme de recherche
   * @param {Object} [filters] - Filtres supplémentaires
   * @param {number} [limit=10] - Nombre de résultats
   * @returns {Promise<Array>} Liste des équipes correspondantes
   */
  async searchTeams(query, filters = {}, limit = 10) {
    try {
      const params = new URLSearchParams({
        q: query,
        limit,
        ...filters
      });
      
      logger.info('Searching teams', { query, filters, limit });
      
      const response = await fetchAPI(`/teams/search?${params}`);
      return response.data;
    } catch (error) {
      handleError({
        ...error,
        context: { query, filters, limit }
      }, 'Failed to search teams');
    }
  },

  // Export des sous-services
  members: teamMemberService,
  stats: teamStatsService
};

// Export des constantes pour une utilisation externe
export { TEAM_ROLES, TEAM_PERMISSIONS, hasPermission };