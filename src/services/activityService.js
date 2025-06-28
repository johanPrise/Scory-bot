import { Activity } from '../models/activity.js';
import Team from '../models/Team.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

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
 * Crée une nouvelle activité
 * @param {Object} params - Paramètres de l'activité
 * @param {string} params.name - Nom de l'activité
 * @param {string} params.createdBy - ID du créateur
 * @param {string} params.chatId - ID du chat
 * @param {string} [params.description] - Description de l'activité
 * @param {string} [params.teamId] - ID de l'équipe associée
 * @param {Object} [params.settings] - Paramètres de l'activité
 * @returns {Promise<Object>} L'activité créée
 */
export const createActivity = async ({ name, description, createdBy, chatId, teamId, settings = {} }) => {
  try {
    if (!name || !createdBy || !chatId) {
      throw new Error('Nom de l\'activité, ID du créateur et ID du chat sont requis');
    }

    logger.info(`Création de l'activité: ${name}`, { createdBy, chatId, teamId });
    
    // Vérifier si une activité avec ce nom existe déjà dans ce chat
    const existingActivity = await Activity.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      chatId
    });
    
    if (existingActivity) {
      throw new Error(`Une activité nommée "${name}" existe déjà dans ce chat`);
    }
    
    // Vérifier que l'utilisateur créateur existe
    const creator = await User.findById(createdBy);
    if (!creator) {
      throw new Error('Utilisateur créateur non trouvé');
    }

    // Si teamId est fourni, vérifier que l'équipe existe
    if (teamId) {
      const team = await Team.findById(teamId);
      if (!team) {
        throw new Error('Équipe non trouvée');
      }
    }

    // Créer l'activité
    const activity = new Activity({
      name,
      description: description || '',
      createdBy,
      chatId,
      teamId: teamId || undefined,
      settings: {
        isActive: true,
        startDate: new Date(),
        isRecurring: false,
        maxParticipants: settings.maxParticipants || 50,
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

    logger.info(`Activité créée: ${activity._id}`, { name, createdBy });
    return activity;
  } catch (error) {
    return handleError(error, 'Erreur lors de la création de l\'activité');
  }
};

/**
 * Ajoute une sous-activité à une activité existante
 * @param {string} activityId - ID de l'activité parent
 * @param {string} name - Nom de la sous-activité
 * @param {number} maxScore - Score maximum possible
 * @param {Object} options - Options supplémentaires
 * @param {string} [options.description] - Description de la sous-activité
 * @param {string} [options.createdBy] - ID du créateur
 * @returns {Promise<Object>} L'activité mise à jour
 */
export const addSubActivity = async (activityId, name, maxScore, options = {}) => {
  try {
    if (!activityId || !name) {
      throw new Error('ID de l\'activité et nom de la sous-activité sont requis');
    }
    
    if (isNaN(maxScore) || maxScore <= 0) {
      maxScore = 100; // Valeur par défaut
    }

    logger.info(`Ajout de la sous-activité ${name} à ${activityId}`, { maxScore });
    
    // Trouver l'activité parent
    const activity = await Activity.findById(activityId);
    if (!activity) {
      throw new Error('Activité parent non trouvée');
    }

    // Vérifier que la sous-activité n'existe pas déjà
    const existingSubActivity = activity.subActivities.find(sub => 
      sub.name.toLowerCase() === name.toLowerCase()
    );
    
    if (existingSubActivity) {
      throw new Error('Une sous-activité avec ce nom existe déjà');
    }

    // Ajouter la sous-activité
    activity.subActivities.push({
      name,
      description: options.description || '',
      maxScore: maxScore,
      createdAt: new Date()
    });

    await activity.save();

    logger.info(`Sous-activité ajoutée: ${activityId} -> ${name}`, { maxScore });
    return activity;
  } catch (error) {
    return handleError(error, 'Erreur lors de l\'ajout de la sous-activité');
  }
};

/**
 * Récupère la liste des activités
 * @param {Object} options - Options de filtrage
 * @param {boolean} [options.includeSubActivities=false] - Inclure les sous-activités
 * @param {string} [options.chatId] - Filtrer par ID de chat
 * @param {string} [options.teamId] - Filtrer par ID d'équipe
 * @param {boolean} [options.activeOnly=false] - Seulement les activités actives
 * @param {number} [options.limit=20] - Limite de résultats
 * @param {number} [options.skip=0] - Nombre de résultats à sauter
 * @returns {Promise<Array>} Liste des activités
 */
export const listActivities = async ({ 
  includeSubActivities = false, 
  chatId, 
  teamId, 
  activeOnly = false,
  limit = 20,
  skip = 0
}) => {
  try {
    logger.info('Récupération de la liste des activités', { includeSubActivities, chatId, teamId });
    
    // Construction du filtre
    const filter = {};
    if (chatId) filter.chatId = chatId;
    if (teamId) filter.teamId = teamId;
    if (activeOnly) filter['settings.isActive'] = true;
    
    const activities = await Activity.find(filter)
      .populate('createdBy', 'username firstName lastName')
      .populate('teamId', 'name description')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Filtrer les sous-activités si demandé
    const result = activities.map(activity => {
      const activityObj = activity.toObject();
      if (!includeSubActivities) {
        delete activityObj.subActivities;
      }
      return activityObj;
    });
    
    logger.info(`Récupéré ${result.length} activités`, { chatId, teamId });
    return result;
  } catch (error) {
    return handleError(error, 'Erreur lors de la récupération des activités');
  }
};

/**
 * Récupère une activité par son ID
 * @param {string} id - ID de l'activité
 * @param {Object} options - Options supplémentaires
 * @param {string} [options.chatId] - ID du chat pour vérification
 * @param {boolean} [options.includeSubActivities=true] - Inclure les sous-activités
 * @returns {Promise<Object>} L'activité
 */
export const getActivity = async (id, options = {}) => {
  try {
    if (!id) {
      throw new Error('ID de l\'activité requis');
    }

    const filter = { _id: id };
    if (options.chatId) filter.chatId = options.chatId;
    
    const activity = await Activity.findOne(filter)
      .populate('createdBy', 'username firstName lastName')
      .populate('teamId', 'name description members');
    
    if (!activity) {
      throw new Error('Activité non trouvée');
    }
    
    // Filtrer les sous-activités si demandé
    if (options.includeSubActivities === false) {
      const activityObj = activity.toObject();
      delete activityObj.subActivities;
      return activityObj;
    }
    
    return activity;
  } catch (error) {
    return handleError(error, 'Erreur lors de la récupération de l\'activité');
  }
};

/**
 * Met à jour une activité existante
 * @param {string} id - ID de l'activité
 * @param {Object} updateData - Données à mettre à jour
 * @param {Object} options - Options supplémentaires
 * @param {string} [options.chatId] - ID du chat pour vérification
 * @param {string} [options.updatedBy] - ID de l'utilisateur qui effectue la mise à jour
 * @returns {Promise<Object>} L'activité mise à jour
 */
export const updateActivity = async (id, updateData, options = {}) => {
  try {
    if (!id || !updateData) {
      throw new Error('ID de l\'activité et données de mise à jour sont requis');
    }

    const filter = { _id: id };
    if (options.chatId) filter.chatId = options.chatId;
    
    const activity = await Activity.findOne(filter);
    if (!activity) {
      throw new Error('Activité non trouvée');
    }

    // Vérifier les permissions si updatedBy est fourni
    if (options.updatedBy) {
      const updater = await User.findById(options.updatedBy);
      if (!updater) {
        throw new Error('Utilisateur qui met à jour non trouvé');
      }
      
      // Seul le créateur ou un admin d'équipe peut mettre à jour
      const isCreator = activity.createdBy.toString() === options.updatedBy;
      const isTeamAdmin = activity.teamId && updater.isTeamAdmin(activity.teamId);
      
      if (!isCreator && !isTeamAdmin) {
        throw new Error('Vous n\'avez pas les permissions pour mettre à jour cette activité');
      }
    }

    // Champs autorisés pour la mise à jour
    const allowedUpdates = ['name', 'description', 'settings'];
    const filteredUpdates = {};

    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updateData[key];
      }
    });

    // Appliquer les mises à jour
    Object.assign(activity, filteredUpdates);
    await activity.save();
    
    logger.info(`Activité ${id} mise à jour`, { updatedBy: options.updatedBy });
    return activity;
  } catch (error) {
    return handleError(error, 'Erreur lors de la mise à jour de l\'activité');
  }
};

/**
 * Supprime une activité
 * @param {string} id - ID de l'activité
 * @param {Object} options - Options supplémentaires
 * @param {string} [options.chatId] - ID du chat pour vérification
 * @param {string} [options.deletedBy] - ID de l'utilisateur qui effectue la suppression
 * @returns {Promise<boolean>} True si la suppression a réussi
 */
export const deleteActivity = async (id, options = {}) => {
  try {
    if (!id) {
      throw new Error('ID de l\'activité requis');
    }

    const filter = { _id: id };
    if (options.chatId) filter.chatId = options.chatId;
    
    const activity = await Activity.findOne(filter);
    if (!activity) {
      throw new Error('Activité non trouvée');
    }

    // Vérifier les permissions si deletedBy est fourni
    if (options.deletedBy) {
      const deleter = await User.findById(options.deletedBy);
      if (!deleter) {
        throw new Error('Utilisateur qui supprime non trouvé');
      }
      
      // Seul le créateur ou un admin d'équipe peut supprimer
      const isCreator = activity.createdBy.toString() === options.deletedBy;
      const isTeamAdmin = activity.teamId && deleter.isTeamAdmin(activity.teamId);
      
      if (!isCreator && !isTeamAdmin) {
        throw new Error('Vous n\'avez pas les permissions pour supprimer cette activité');
      }
    }

    // Retirer l'activité de l'équipe si applicable
    if (activity.teamId) {
      const team = await Team.findById(activity.teamId);
      if (team) {
        team.activities = team.activities.filter(actId => 
          actId.toString() !== activity._id.toString()
        );
        await team.save();
      }
    }

    await Activity.findByIdAndDelete(id);
    
    logger.info(`Activité ${id} supprimée`, { deletedBy: options.deletedBy });
    return true;
  } catch (error) {
    return handleError(error, 'Erreur lors de la suppression de l\'activité');
  }
};

/**
 * Recherche des activités
 * @param {string} query - Terme de recherche
 * @param {Object} filters - Filtres supplémentaires
 * @param {string} [filters.chatId] - Filtrer par ID de chat
 * @param {string} [filters.teamId] - Filtrer par ID d'équipe
 * @param {string} [filters.createdBy] - Filtrer par créateur
 * @param {boolean} [filters.activeOnly=false] - Seulement les activités actives
 * @param {number} [filters.limit=10] - Limite de résultats
 * @returns {Promise<Array>} Activités correspondantes
 */
export const searchActivities = async (query, filters = {}, limit = 10) => {
  try {
    if (!query) {
      throw new Error('Terme de recherche requis');
    }

    const filter = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    };
    
    if (filters.chatId) filter.chatId = filters.chatId;
    if (filters.teamId) filter.teamId = filters.teamId;
    if (filters.createdBy) filter.createdBy = filters.createdBy;
    if (filters.activeOnly) filter['settings.isActive'] = true;
    
    const activities = await Activity.find(filter)
      .populate('createdBy', 'username firstName lastName')
      .populate('teamId', 'name description')
      .sort({ createdAt: -1 })
      .limit(limit);
    
    logger.info(`Recherche d'activités: ${query}`, { resultCount: activities.length });
    return activities;
  } catch (error) {
    return handleError(error, 'Erreur lors de la recherche d\'activités');
  }
};

/**
 * Récupère l'historique des activités
 * @param {Object} options - Options de filtrage
 * @param {string} [options.userId] - ID de l'utilisateur
 * @param {number} [options.limit=10] - Nombre maximum d'entrées à récupérer
 * @param {string} [options.period='day'] - Période ('day', 'week', 'month', 'year')
 * @param {string} [options.chatId] - ID du chat
 * @param {string} [options.teamId] - ID de l'équipe
 * @returns {Promise<Array>} Liste des activités
 */
export const getActivityHistory = async ({ userId, limit = 10, period = 'day', chatId, teamId }) => {
  try {
    logger.info('Récupération de l\'historique des activités', { userId, limit, period, chatId, teamId });
    
    // Calculer la date de début selon la période
    let startDate;
    const now = new Date();
    
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
      default:
        startDate = null;
    }

    // Construction du filtre
    const filter = {};
    if (userId) filter.createdBy = userId;
    if (chatId) filter.chatId = chatId;
    if (teamId) filter.teamId = teamId;
    if (startDate) filter.createdAt = { $gte: startDate };
    
    const activities = await Activity.find(filter)
      .populate('createdBy', 'username firstName lastName')
      .populate('teamId', 'name description')
      .sort({ createdAt: -1 })
      .limit(limit);
    
    logger.info(`Récupéré ${activities.length} entrées d'historique`, { userId, period });
    return activities;
  } catch (error) {
    return handleError(error, 'Erreur lors de la récupération de l\'historique des activités');
  }
};

/**
 * Obtient les statistiques d'une activité
 * @param {string} activityId - ID de l'activité
 * @param {Object} options - Options supplémentaires
 * @param {string} [options.chatId] - ID du chat pour vérification
 * @returns {Promise<Object>} Statistiques de l'activité
 */
export const getActivityStats = async (activityId, options = {}) => {
  try {
    if (!activityId) {
      throw new Error('ID de l\'activité requis');
    }

    const filter = { _id: activityId };
    if (options.chatId) filter.chatId = options.chatId;
    
    const activity = await Activity.findOne(filter);
    if (!activity) {
      throw new Error('Activité non trouvée');
    }

    return {
      ...activity.stats.toObject(),
      subActivitiesCount: activity.subActivities.length,
      isActive: activity.settings.isActive,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt
    };
  } catch (error) {
    return handleError(error, 'Erreur lors de la récupération des statistiques de l\'activité');
  }
};

export default {
  createActivity,
  addSubActivity,
  listActivities,
  getActivity,
  updateActivity,
  deleteActivity,
  searchActivities,
  getActivityStats
};