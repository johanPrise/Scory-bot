// src/services/teamService.js
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
 * @param {string} role - Le rôle à vérifier
 * @param {string} permission - La permission requise
 * @returns {boolean} True si le rôle a la permission
 */
export const hasPermission = (role, permission) => {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
};

/**
 * Fonction utilitaire pour gérer les erreurs
 * @param {Error} error - L'erreur à gérer
 * @param {string} customMessage - Message personnalisé
 * @throws {Error} Erreur avec message personnalisé
 */
const handleError = (error, customMessage) => {
  logger.error(`${customMessage}: ${error.message}`, { error });
  const errorToThrow = new Error(customMessage);
  errorToThrow.originalError = error;
  errorToThrow.status = error.status || 500;
  throw errorToThrow;
};

/**
 * Crée une nouvelle équipe
 * @param {string} name - Nom de l'équipe
 * @param {string} chatId - ID du chat
 * @param {string} creatorId - ID du créateur
 * @param {Object} options - Options supplémentaires
 * @param {string} [options.description] - Description de l'équipe
 * @param {boolean} [options.isPrivate=false] - Si l'équipe est privée
 * @param {number} [options.maxMembers=10] - Nombre maximum de membres
 * @returns {Promise<Object>} L'équipe créée
 */
export const createTeam = async (name, chatId, creatorId, options = {}) => {
  try {
    if (!name || !chatId || !creatorId) {
      throw new Error('Nom de l\'équipe, ID du chat et ID du créateur sont requis');
    }

    logger.info(`Création de l'équipe: ${name}`, { creatorId, chatId });

    // Vérifier si une équipe avec ce nom existe déjà dans ce chat
    const existingTeam = await Team.findOne({ name, chatId });
    if (existingTeam) {
      throw new Error(`Une équipe nommée "${name}" existe déjà dans ce chat`);
    }

    // Vérifier que l'utilisateur créateur existe
    const creator = await User.findById(creatorId);
    if (!creator) {
      throw new Error('Utilisateur créateur non trouvé');
    }

    // Créer l'équipe
    const team = new Team({
      name,
      description: options.description || '',
      chatId,
      createdBy: creatorId,
      members: [{
        userId: creatorId,
        username: creator.username,
        joinedAt: new Date(),
        isAdmin: true
      }],
      settings: {
        maxMembers: options.maxMembers || 10,
        isPrivate: options.isPrivate || false
      }
    });

    await team.save();

    // Ajouter l'équipe à l'utilisateur
    await creator.addToTeam(team._id, TEAM_ROLES.OWNER);

    logger.info(`Équipe créée: ${team._id}`, { name, creatorId });
    return team;
  } catch (error) {
    return handleError(error, 'Erreur lors de la création de l\'équipe');
  }
};

/**
 * Ajoute un membre à une équipe
 * @param {string} teamId - ID de l'équipe
 * @param {string} userId - ID de l'utilisateur à ajouter
 * @param {Object} options - Options supplémentaires
 * @param {boolean} [options.isAdmin=false] - Si le membre est administrateur
 * @param {string} [options.addedBy] - ID de l'utilisateur qui ajoute
 * @returns {Promise<Object>} L'équipe mise à jour
 */
export const addMemberToTeam = async (teamId, userId, options = {}) => {
  try {
    if (!teamId || !userId) {
      throw new Error('ID de l\'équipe et ID de l\'utilisateur sont requis');
    }

    logger.info(`Ajout du membre ${userId} à l'équipe ${teamId}`, options);

    // Vérifier que l'équipe existe
    const team = await Team.findById(teamId);
    if (!team) {
      throw new Error('Équipe non trouvée');
    }

    // Vérifier que l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Vérifier si l'utilisateur est déjà membre
    const isMember = team.members.some(member => 
      member.userId.toString() === userId.toString()
    );

    if (isMember) {
      throw new Error('Cet utilisateur est déjà membre de l\'équipe');
    }

    // Vérifier la limite de membres
    if (team.members.length >= team.settings.maxMembers) {
      throw new Error('Le nombre maximum de membres a été atteint');
    }

    // Ajouter le membre à l'équipe
    team.members.push({
      userId,
      username: user.username,
      joinedAt: new Date(),
      isAdmin: options.isAdmin || false
    });

    await team.save();

    // Ajouter l'équipe à l'utilisateur
    await user.addToTeam(teamId, options.isAdmin ? TEAM_ROLES.ADMIN : TEAM_ROLES.MEMBER);

    logger.info(`Membre ${userId} ajouté à l'équipe ${teamId}`);
    return team;
  } catch (error) {
    return handleError(error, 'Erreur lors de l\'ajout du membre à l\'équipe');
  }
};

/**
 * Récupère une équipe par son ID
 * @param {string} teamId - ID de l'équipe
 * @param {Object} options - Options supplémentaires
 * @param {boolean} [options.populateMembers=false] - Si les membres doivent être peuplés
 * @returns {Promise<Object>} L'équipe
 */
export const getTeam = async (teamId, options = {}) => {
  try {
    if (!teamId) {
      throw new Error('ID de l\'équipe requis');
    }

    let query = Team.findById(teamId);

    if (options.populateMembers) {
      query = query.populate({
        path: 'members.userId',
        select: 'username firstName lastName avatar'
      });
    }

    const team = await query;
    if (!team) {
      throw new Error('Équipe non trouvée');
    }

    return team;
  } catch (error) {
    return handleError(error, 'Erreur lors de la récupération de l\'équipe');
  }
};

/**
 * Récupère les équipes d'un chat
 * @param {string} chatId - ID du chat
 * @param {Object} options - Options supplémentaires
 * @param {number} [options.limit=10] - Limite de résultats
 * @param {number} [options.skip=0] - Nombre de résultats à sauter
 * @returns {Promise<Array>} Liste des équipes
 */
export const getTeamsByChatId = async (chatId, options = {}) => {
  try {
    if (!chatId) {
      throw new Error('ID du chat requis');
    }

    const teams = await Team.find({ chatId })
      .sort({ createdAt: -1 })
      .limit(options.limit || 10)
      .skip(options.skip || 0);

    return teams;
  } catch (error) {
    return handleError(error, 'Erreur lors de la récupération des équipes du chat');
  }
};

/**
 * Récupère les équipes d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Array>} Liste des équipes
 */
export const getUserTeams = async (userId) => {
  try {
    if (!userId) {
      throw new Error('ID de l\'utilisateur requis');
    }

    const user = await User.findById(userId).populate('teams.team');
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    return user.teams.map(teamMembership => ({
      team: teamMembership.team,
      role: teamMembership.role,
      joinedAt: teamMembership.joinedAt
    }));
  } catch (error) {
    return handleError(error, 'Erreur lors de la récupération des équipes de l\'utilisateur');
  }
};

/**
 * Supprime un membre d'une équipe
 * @param {string} teamId - ID de l'équipe
 * @param {string} userId - ID de l'utilisateur à supprimer
 * @param {string} removedBy - ID de l'utilisateur qui effectue la suppression
 * @returns {Promise<Object>} L'équipe mise à jour
 */
export const removeMemberFromTeam = async (teamId, userId, removedBy) => {
  try {
    if (!teamId || !userId || !removedBy) {
      throw new Error('ID de l\'équipe, ID de l\'utilisateur et ID de celui qui supprime sont requis');
    }

    // Vérifier que l'équipe existe
    const team = await Team.findById(teamId);
    if (!team) {
      throw new Error('Équipe non trouvée');
    }

    // Vérifier que l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Vérifier les permissions
    const remover = await User.findById(removedBy);
    if (!remover) {
      throw new Error('Utilisateur qui supprime non trouvé');
    }

    // Vérifier si l'utilisateur qui supprime est admin ou propriétaire
    const isRemoverAdmin = remover.isTeamAdmin(teamId);
    const isRemoverOwner = remover.isTeamOwner(teamId);
    const isUserOwner = user.isTeamOwner(teamId);

    // Le propriétaire ne peut pas être supprimé
    if (isUserOwner) {
      throw new Error('Le propriétaire de l\'équipe ne peut pas être supprimé');
    }

    // Seul un admin ou le propriétaire peut supprimer un membre
    if (!isRemoverAdmin && !isRemoverOwner) {
      throw new Error('Vous n\'avez pas les permissions pour supprimer un membre');
    }

    // Un admin ne peut pas supprimer un autre admin (sauf s'il est propriétaire)
    const isUserAdmin = user.isTeamAdmin(teamId);
    if (isUserAdmin && !isRemoverOwner) {
      throw new Error('Seul le propriétaire peut supprimer un administrateur');
    }

    // Supprimer le membre de l'équipe
    await team.removeMember(userId);

    // Supprimer l'équipe de l'utilisateur
    await user.removeFromTeam(teamId);

    logger.info(`Membre ${userId} supprimé de l'équipe ${teamId} par ${removedBy}`);
    return team;
  } catch (error) {
    return handleError(error, 'Erreur lors de la suppression du membre de l\'équipe');
  }
};

/**
 * Met à jour les informations d'une équipe
 * @param {string} teamId - ID de l'équipe
 * @param {Object} updates - Mises à jour à appliquer
 * @param {string} updatedBy - ID de l'utilisateur qui effectue la mise à jour
 * @returns {Promise<Object>} L'équipe mise à jour
 */
export const updateTeam = async (teamId, updates, updatedBy) => {
  try {
    if (!teamId || !updates || !updatedBy) {
      throw new Error('ID de l\'équipe, mises à jour et ID de celui qui met à jour sont requis');
    }

    // Vérifier que l'équipe existe
    const team = await Team.findById(teamId);
    if (!team) {
      throw new Error('Équipe non trouvée');
    }

    // Vérifier les permissions
    const updater = await User.findById(updatedBy);
    if (!updater) {
      throw new Error('Utilisateur qui met à jour non trouvé');
    }

    // Vérifier si l'utilisateur qui met à jour est admin ou propriétaire
    const isUpdaterAdmin = updater.isTeamAdmin(teamId);
    const isUpdaterOwner = updater.isTeamOwner(teamId);

    if (!isUpdaterAdmin && !isUpdaterOwner) {
      throw new Error('Vous n\'avez pas les permissions pour mettre à jour l\'équipe');
    }

    // Champs autorisés pour la mise à jour
    const allowedUpdates = ['name', 'description', 'settings'];
    const filteredUpdates = {};

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    // Appliquer les mises à jour
    Object.assign(team, filteredUpdates);
    await team.save();

    logger.info(`Équipe ${teamId} mise à jour par ${updatedBy}`);
    return team;
  } catch (error) {
    return handleError(error, 'Erreur lors de la mise à jour de l\'équipe');
  }
};

/**
 * Récupère le classement des équipes
 * @param {Object} options - Options de filtrage
 * @param {string} [options.chatId] - ID du chat
 * @param {string} [options.activityName] - Nom de l'activité pour filtrer
 * @param {number} [options.limit=10] - Nombre maximum d'équipes à récupérer
 * @returns {Promise<Array>} Liste des équipes classées par score
 */
export const getTeamRanking = async ({ chatId, activityName = null, limit = 10 }) => {
  try {
    if (!chatId) {
      throw new Error('ID du chat requis');
    }

    logger.info('Récupération du classement des équipes', { chatId, activityName });
    
    // Construire le filtre de base
    const filter = { chatId };
    
    // Récupérer les équipes
    let teams = await Team.find(filter)
      .populate({
        path: 'members.userId',
        select: 'username firstName lastName'
      })
      .limit(limit);
    
    // Si aucune équipe n'est trouvée, retourner un tableau vide
    if (!teams || teams.length === 0) {
      return [];
    }
    
    // Transformer les équipes pour le classement
    const teamRanking = await Promise.all(teams.map(async (team) => {
      // Calculer le score total de l'équipe
      let totalScore = 0;
      let lastActivity = null;
      
      // Si un nom d'activité est fourni, filtrer par cette activité
      if (activityName) {
        // Logique pour récupérer les scores spécifiques à une activité
        // Cette partie dépend de la structure de votre modèle de données
        // et de la façon dont vous stockez les scores
        
        // Exemple simplifié:
        totalScore = team.stats?.activityScores?.[activityName] || 0;
      } else {
        // Sinon, utiliser le score total de l'équipe
        totalScore = team.stats?.totalScore || 0;
      }
      
      // Formater la dernière activité
      if (team.stats?.lastActivity) {
        const date = new Date(team.stats.lastActivity);
        lastActivity = date.toLocaleDateString('fr-FR');
      }
      
      return {
        id: team._id,
        name: team.name,
        score: totalScore,
        members: team.members.map(member => ({
          id: member.userId?._id || member.userId,
          username: member.userId?.username || member.username
        })),
        lastActivity
      };
    }));
    
    // Trier par score décroissant
    teamRanking.sort((a, b) => b.score - a.score);
    
    logger.info(`Récupéré ${teamRanking.length} équipes pour le classement`, { chatId });
    return teamRanking;
  } catch (error) {
    return handleError(error, 'Erreur lors de la récupération du classement des équipes');
  }
};

/**
 * Supprime une équipe
 * @param {string} teamId - ID de l'équipe
 * @param {string} deletedBy - ID de l'utilisateur qui effectue la suppression
 * @returns {Promise<boolean>} True si la suppression a réussi
 */
export const deleteTeam = async (teamId, deletedBy) => {
  try {
    if (!teamId || !deletedBy) {
      throw new Error('ID de l\'équipe et ID de celui qui supprime sont requis');
    }

    // Vérifier que l'équipe existe
    const team = await Team.findById(teamId);
    if (!team) {
      throw new Error('Équipe non trouvée');
    }

    // Vérifier les permissions
    const deleter = await User.findById(deletedBy);
    if (!deleter) {
      throw new Error('Utilisateur qui supprime non trouvé');
    }

    // Seul le propriétaire peut supprimer l'équipe
    const isDeleterOwner = deleter.isTeamOwner(teamId);
    if (!isDeleterOwner) {
      throw new Error('Seul le propriétaire peut supprimer l\'équipe');
    }

    // Supprimer l'équipe des utilisateurs
    for (const member of team.members) {
      const user = await User.findById(member.userId);
      if (user) {
        await user.removeFromTeam(teamId);
      }
    }

    // Supprimer l'équipe
    await Team.findByIdAndDelete(teamId);

    logger.info(`Équipe ${teamId} supprimée par ${deletedBy}`);
    return true;
  } catch (error) {
    return handleError(error, 'Erreur lors de la suppression de l\'équipe');
  }
};

export default {
  createTeam,
  addMemberToTeam,
  getTeam,
  getTeamsByChatId,
  getUserTeams,
  removeMemberFromTeam,
  updateTeam,
  deleteTeam,
  hasPermission,
  TEAM_ROLES,
  TEAM_PERMISSIONS
};