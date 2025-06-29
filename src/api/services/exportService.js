import { Activity } from '../models/activity.js';

export const exportActivityData = async (activityId) => {
  const activity = await Activity.findById(activityId);
  if (!activity) {
    throw new Error('Activity not found');
  }

  // Convertir les Map en objets pour la sérialisation JSON
  const exportData = {
    ...activity.toObject(),
    subActivities: activity.subActivities.map(sa => ({
      ...sa,
      scores: Object.fromEntries(sa.scores)
    }))
  };

  return exportData;
};