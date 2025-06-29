import { Activity } from '../models/activity.js';

export const startTimer = async (activityId, durationMinutes) => {
  const activity = await Activity.findById(activityId);
  if (!activity) {
    throw new Error('Activity not found');
  }

  activity.timer = {
    startTime: new Date(),
    duration: durationMinutes * 60 * 1000 // Convertir en millisecondes
  };

  return await activity.save();
};

export const stopTimer = async (activityId) => {
  const activity = await Activity.findById(activityId);
  if (!activity) {
    throw new Error('Activity not found');
  }

  if (!activity.timer) {
    throw new Error('No timer running for this activity');
  }

  const endTime = new Date();
  const elapsedTime = endTime - activity.timer.startTime;
  
  activity.timer.endTime = endTime;
  activity.timer.elapsedTime = elapsedTime;

  return await activity.save();
};

export const getTimerStatus = async (activityId) => {
  const activity = await Activity.findById(activityId);
  if (!activity || !activity.timer) {
    return null;
  }

  const now = new Date();
  const elapsedTime = now - activity.timer.startTime;
  const remainingTime = Math.max(0, activity.timer.duration - elapsedTime);

  return {
    isRunning: !activity.timer.endTime,
    startTime: activity.timer.startTime,
    elapsedTime,
    remainingTime
  };
};