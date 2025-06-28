import Team from '../models/Team.js';
import User from '../models/User.js';
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
    
    // Vérifier si une équipe avec ce nom existe déjà dans ce chat
    const existingTeam = await Team.findOne({ name, chatId });
    if (existingTeam) {
      throw new Error('Une équipe avec ce nom existe déjà dans ce chat');
    }

    // Vérifier que l'utilisateur créateur existe
    const creator = await User.findById(createdBy);
    if (!creator) {
      throw new Error('Utilisateur créateur non trouvé');
    }

    const defaultSettings = {
      joinRequests: false,
      defaultRole: TEAM_ROLES.MEMBER,
      memberLimit: 50,
      maxMembers: 10,
      isPrivate: visibility === 'private',
      ...settings
    };
    
    // Créer l'équipe
    const team = new Team({
      name,
      description,
      chatId,
      createdBy,
      settings: defaultSettings,
      members: [{
        userId: createdBy,
        username: creator.username,
        isAdmin: true,
        joinedAt: new Date()
      }]
    });

    await team.save();

    // Ajouter l'équipe à l'utilisateur
    await creator.addToTeam(team._id, TEAM_ROLES.OWNER);

    logger.info(`Team created: ${team._id}`, { 
      teamId: team._id,
      name,
      createdBy 
    });
    
    return team;
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
      
      const team = await Team.findById(teamId);
      if (!team) {
        throw new Error('Équipe non trouvée');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Ajouter le membre à l'équipe
      await team.addMember(userId, user.username, role === TEAM_ROLES.ADMIN);
      
      // Ajouter l'équipe à l'utilisateur
      await user.addToTeam(teamId, role);

      logger.info(`Member ${userId} added to team ${teamId}`, { role });
      return { userId, username: user.username, role, joinedAt: new Date() };
    } catch (error) {
      handleError({
        ...error,
        context: { teamId, userId, role }
      }, 'Failed to add team member');
    }
  },

  /**
   * Met à jour le rôle d'un membre
   */
  async updateMemberRole(teamId, userId, role, updatedBy) {
    try {
      if (!Object.values(TEAM_ROLES).includes(role)) {
        throw new Error('Invalid team role');
      }
      
      logger.info(`Updating role for member ${userId} in team ${teamId}`, { role, updatedBy });
      
      const team = await Team.findById(teamId);
      if (!team) {
        throw new Error('Équipe non trouvée');
      }

      // Trouver le membre dans l'équipe
      const memberIndex = team.members.findIndex(member => 
        member.userId.toString() === userId
      );

      if (memberIndex === -1) {
        throw new Error('Membre non trouvé dans cette équipe');
      }

      // Mettre à jour le rôle dans l'équipe
      team.members[memberIndex].isAdmin = role === TEAM_ROLES.ADMIN || role === TEAM_ROLES.OWNER;
      await team.save();

      // Mettre à jour le rôle dans l'utilisateur
      const user = await User.findById(userId);
      if (user) {
        await user.addToTeam(teamId, role);
      }

      logger.info(`Role updated for member ${userId} in team ${teamId}`, { role });
      return { userId, role };
    } catch (error) {
      handleError({
        ...error,
        context: { teamId, userId, role, updatedBy }
      }, 'Failed to update team member role');
    }
  },

  /**
   * Supprime un membre d'une équipe
   */
  async removeMember(teamId, userId, removedBy) {
    try {
      logger.info(`Removing member ${userId} from team ${teamId}`, { removedBy });
      
      const team = await Team.findById(teamId);
      if (!team) {
        throw new Error('Équipe non trouvée');
      }

      // Empêcher de retirer le créateur
      if (team.createdBy.toString() === userId) {
        throw new Error('Impossible de retirer le créateur de l\'équipe');
      }

      // Retirer le membre de l'équipe
      await team.removeMember(userId);

      // Retirer l'équipe de l'utilisateur
      const user = await User.findById(userId);
      if (user) {
        await user.removeFromTeam(teamId);
      }

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
   */
  async listMembers(teamId, { limit = 20, offset = 0, role } = {}) {
    try {
      logger.info(`Fetching members for team ${teamId}`, { limit, offset, role });
      
      const team = await Team.findById(teamId)
        .populate('members.userId', 'username firstName lastName avatar stats');

      if (!team) {
        throw new Error('Équipe non trouvée');
      }

      let members = team.members;

      // Filtrer par rôle si spécifié
      if (role) {
        members = members.filter(member => 
          role === 'admin' ? member.isAdmin : !member.isAdmin
        );
      }

      // Pagination manuelle
      const startIndex = offset;
      const endIndex = startIndex + limit;
      const paginatedMembers = members.slice(startIndex, endIndex);

      return {
        members: paginatedMembers,
        total: members.length
      };
    } catch (error) {
      handleError({
        ...error,
        context: { teamId, limit, offset, role }
      }, 'Failed to list team members');
    }
  }
};

/**
 * Service principal de gestion des équipes
 */
export const teamService = {
  /**
   * Récupère les informations détaillées d'une équipe
   */
  async getTeam(teamId, { includeMembers = false, includeStats = false } = {}) {
    try {
      logger.info(`Fetching team ${teamId}`, { includeMembers, includeStats });
      
      const populateOptions = [
        { path: 'createdBy', select: 'username firstName lastName avatar' }
      ];

      if (includeMembers) {
        populateOptions.push({
          path: 'members.userId',
          select: 'username firstName lastName avatar stats'
        });
      }

      const team = await Team.findById(teamId).populate(populateOptions);

      if (!team) {
        throw new Error('Équipe non trouvée');
      }

      let stats = {};
      if (includeStats) {
        stats = {
          ...team.stats.toObject(),
          memberCount: team.members.length,
          adminCount: team.members.filter(m => m.isAdmin).length,
          activitiesCount: team.activities.length
        };
      }

      return {
        ...team.toObject(),
        stats: includeStats ? stats : team.stats
      };
    } catch (error) {
      handleError({
        ...error,
        context: { teamId, includeMembers, includeStats }
      }, 'Failed to get team');
    }
  },

  /**
   * Liste les équipes avec des options de filtrage et de pagination
   */
  async listTeams(
    filters = {},
    { limit = 20, offset = 0 } = {},
    sort = 'createdAt',
    order = 'desc'
  ) {
    try {
      logger.info('Listing teams', { filters, limit, offset, sort, order });
      
      // Construction du filtre MongoDB
      const mongoFilter = {};
      
      if (filters.search) {
        mongoFilter.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } }
        ];
      }
      
      if (filters.chatId) mongoFilter.chatId = filters.chatId;
      if (filters.ownerId) mongoFilter.createdBy = filters.ownerId;

      const sortOrder = order === 'desc' ? -1 : 1;
      
      const teams = await Team.find(mongoFilter)
        .populate('createdBy', 'username firstName lastName avatar')
        .sort({ [sort]: sortOrder })
        .limit(limit)
        .skip(offset);

      const total = await Team.countDocuments(mongoFilter);

      return {
        teams,
        total
      };
    } catch (error) {
      handleError({
        ...error,
        context: { filters, limit, offset, sort, order }
      }, 'Failed to list teams');
    }
  },

  // Export des sous-services
  members: teamMemberService,

  /**
   * Récupère le classement des équipes pour un chat donné
   */
  async getTeamRanking({ chatId, activityName = null } = {}) {
    try {
      logger.info(`Getting team ranking for chat ${chatId}`, { activityName });
      
      const filter = { chatId };
      
      const teams = await Team.find(filter)
        .populate('createdBy', 'username firstName lastName')
        .populate('members.userId', 'username firstName lastName')
        .sort({ 'stats.totalScore': -1, createdAt: 1 });

      const ranking = teams.map(team => ({
        id: team._id,
        name: team.name,
        description: team.description,
        score: team.stats.totalScore || 0,
        members: team.members.map(member => ({
          username: member.userId?.username || member.username,
          isAdmin: member.isAdmin
        })),
        lastActivity: team.stats.lastActivity,
        createdAt: team.createdAt
      }));

      return ranking;
    } catch (error) {
      handleError({
        ...error,
        context: { chatId, activityName }
      }, 'Failed to get team ranking');
    }
  }
};

/**
 * Export de la fonction getTeamRanking pour compatibilité
 */
export const getTeamRanking = teamService.getTeamRanking;

// Les constantes sont déjà exportées individuellement ci-dessus
// export { TEAM_ROLES, TEAM_PERMISSIONS };