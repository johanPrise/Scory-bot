import { Activity } from '../models/activity.js';
import Team from '../models/Team.js';
import User from '../models/User.js';
import logger from '../../utils/logger.js';

// Fonction utilitaire pour gérer les erreurs
const handleError = (error, customMessage) => {
  logger.error(`${customMessage}: ${error.message}`, { error });
  throw new Error(customMessage);
};

/**
 * Crée une nouvelle activité
 */
export const createActivity = async ({ name, description, createdBy, chatId, teamId }) => {
  try {
    logger.info(`Creating new activity: ${name}`, { createdBy, chatId, teamId });
    
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
      description,
      createdBy,
      chatId,
      teamId: teamId || undefined,
      settings: {
        isActive: true,
        startDate: new Date(),
        isRecurring: false,
        maxParticipants: 50
      }
    });

    await activity.save();

    // Ajouter l'activité à l'équipe si applicable
    if (teamId) {
      const team = await Team.findById(teamId);
      team.activities.push(activity._id);
      await team.save();
    }

    logger.info(`Activity created: ${activity._id}`, { name, createdBy });
    return activity;
  } catch (error) {
    handleError(error, 'Error creating activity');
  }
};

/**
 * Ajoute une sous-activité à une activité existante
 */
export const addSubActivity = async ({ parentActivityId, name, description, createdBy, chatId }) => {
  try {
    logger.info(`Adding subactivity ${name} to ${parentActivityId}`, { createdBy, chatId });
    
    // Trouver l'activité parent
    const activity = await Activity.findById(parentActivityId);
    if (!activity) {
      throw new Error('Activité parent non trouvée');
    }

    // Vérifier que la sous-activité n'existe pas déjà
    const existingSubActivity = activity.subActivities.find(sub => sub.name === name);
    if (existingSubActivity) {
      throw new Error('Une sous-activité avec ce nom existe déjà');
    }

    // Ajouter la sous-activité
    activity.subActivities.push({
      name,
      description,
      maxScore: 100,
      createdAt: new Date()
    });

    await activity.save();

    logger.info(`Subactivity added: ${parentActivityId} -> ${name}`, { createdBy });
    return activity;
  } catch (error) {
    handleError(error, 'Error adding subactivity');
  }
};

/**
 * Récupère la liste des activités
 */
export const listActivities = async ({ includeSubActivities = false, chatId, teamId, createdBy }) => {
  try {
    logger.info('Fetching activities list', { includeSubActivities, chatId, teamId, createdBy });
    
    // Construction du filtre
    const filter = {};

    // Si on a à la fois chatId et createdBy, utiliser $or pour montrer
    // les activités du chat actuel OU créées par l'utilisateur
    if (chatId && createdBy) {
      filter.$or = [
        { chatId },
        { createdBy }
      ];
    } else {
      if (chatId) filter.chatId = chatId;
      if (createdBy) filter.createdBy = createdBy;
    }

    if (teamId) filter.teamId = teamId;
    
    const activities = await Activity.find(filter)
      .populate('createdBy', 'username firstName lastName')
      .populate('teamId', 'name description')
      .sort({ createdAt: -1 });

    // Filtrer les sous-activités si demandé
    const result = activities.map(activity => {
      const activityObj = activity.toObject();
      if (!includeSubActivities) {
        delete activityObj.subActivities;
      }
      return activityObj;
    });
    
    logger.info(`Fetched ${result.length} activities`, { chatId, teamId });
    return result;
  } catch (error) {
    handleError(error, 'Error listing activities');
  }
};

/**
 * Récupère l'historique des activités
 */
export const getActivityHistory = async ({ userId, limit = 10, period = 'day', chatId, teamId }) => {
  try {
    logger.info('Fetching activity history', { userId, limit, period, chatId, teamId });
    
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
    
    logger.info(`Fetched ${activities.length} history entries`, { userId, period });
    return activities;
  } catch (error) {
    handleError(error, 'Error fetching activity history');
  }
};

/**
 * Récupère une activité par son ID
 */
export const getActivity = async (id, chatId) => {
  try {
    const filter = { _id: id };
    if (chatId) filter.chatId = chatId;
    
    const activity = await Activity.findOne(filter)
      .populate('createdBy', 'username firstName lastName')
      .populate('teamId', 'name description members');
    
    if (!activity) {
      throw new Error('Activité non trouvée');
    }
    
    return activity;
  } catch (error) {
    handleError(error, 'Error getting activity');
  }
};

/**
 * Récupère toutes les activités
 */
export const getAllActivities = async (chatId) => {
  try {
    const filter = {};
    if (chatId) filter.chatId = chatId;
    
    const activities = await Activity.find(filter)
      .populate('createdBy', 'username firstName lastName')
      .populate('teamId', 'name description')
      .sort({ createdAt: -1 });
    
    return activities;
  } catch (error) {
    handleError(error, 'Error getting all activities');
  }
};

/**
 * Met à jour une activité existante
 */
export const updateActivity = async (id, updateData, chatId) => {
  try {
    const filter = { _id: id };
    if (chatId) filter.chatId = chatId;
    
    const activity = await Activity.findOne(filter);
    if (!activity) {
      throw new Error('Activité non trouvée');
    }

    // Appliquer les mises à jour
    Object.assign(activity, updateData);
    await activity.save();
    
    return activity;
  } catch (error) {
    handleError(error, 'Error updating activity');
  }
};

/**
 * Supprime une activité
 */
export const deleteActivity = async (id, chatId) => {
  try {
    const filter = { _id: id };
    if (chatId) filter.chatId = chatId;
    
    const activity = await Activity.findOne(filter);
    if (!activity) {
      throw new Error('Activité non trouvée');
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
    return true;
  } catch (error) {
    handleError(error, 'Error deleting activity');
  }
};

/**
 * Ajoute un participant à une activité
 */
export const addParticipant = async (activityId, participantName, chatId) => {
  try {
    const filter = { _id: activityId };
    if (chatId) filter.chatId = chatId;
    
    const activity = await Activity.findOne(filter);
    if (!activity) {
      throw new Error('Activité non trouvée');
    }

    // Mettre à jour les statistiques
    activity.stats.totalParticipants += 1;
    await activity.save();
    
    return activity;
  } catch (error) {
    handleError(error, 'Error adding participant');
  }
};

/**
 * Ajoute un score pour une activité (legacy - utiliser scoreService à la place)
 */
export const addScore = async (activityId, participantName, subActivityName, score, chatId) => {
  try {
    const filter = { _id: activityId };
    if (chatId) filter.chatId = chatId;
    
    const activity = await Activity.findOne(filter);
    if (!activity) {
      throw new Error('Activité non trouvée');
    }

    // Mettre à jour les statistiques
    activity.stats.totalSubmissions += 1;
    activity.stats.lastSubmission = new Date();
    
    // Calculer la moyenne des scores
    const currentAverage = activity.stats.averageScore || 0;
    const totalSubmissions = activity.stats.totalSubmissions;
    activity.stats.averageScore = ((currentAverage * (totalSubmissions - 1)) + score) / totalSubmissions;
    
    await activity.save();
    
    return activity;
  } catch (error) {
    handleError(error, 'Error adding score');
  }
};

/**
 * Recherche des activités
 */
export const searchActivities = async (query, filters = {}, limit = 10) => {
  try {
    const filter = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    };
    
    if (filters.chatId) filter.chatId = filters.chatId;
    if (filters.teamId) filter.teamId = filters.teamId;
    if (filters.createdBy) filter.createdBy = filters.createdBy;
    
    const activities = await Activity.find(filter)
      .populate('createdBy', 'username firstName lastName')
      .populate('teamId', 'name description')
      .sort({ createdAt: -1 })
      .limit(limit);
    
    return activities;
  } catch (error) {
    handleError(error, 'Error searching activities');
  }
};

/**
 * Obtient les statistiques d'une activité
 */
export const getActivityStats = async (activityId, chatId) => {
  try {
    const filter = { _id: activityId };
    if (chatId) filter.chatId = chatId;
    
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
    handleError(error, 'Error getting activity stats');
  }
};