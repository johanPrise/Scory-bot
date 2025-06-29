// feedbackService.js
import { Activity } from '../models/activity.js';

export const saveFeedback = async (activityId, username, message, chatId) => {
  const activity = await Activity.findOne({ _id: activityId, chatId });
  if (!activity) {
    throw new Error('Activity not found');
  }
  if (!activity.feedback) {
    activity.feedback = [];
  }
  activity.feedback.push({ user: username, message, date: new Date() });
  return await activity.save();
};

export const getFeedback = async (activityId, chatId) => {
  const activity = await Activity.findOne({ _id: activityId, chatId });
  if (!activity) {
    throw new Error('Activity not found');
  }
  return activity.feedback || [];
};