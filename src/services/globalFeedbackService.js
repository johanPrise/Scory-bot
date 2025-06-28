// services/globalFeedbackService.js
import fs from 'fs';
import path from 'path';

const FEEDBACK_FILE = path.resolve(process.cwd(), 'data', 'global-feedback.json');

export const saveGlobalFeedback = async ({ type, message, username, chatId }) => {
  const feedback = {
    type,
    message,
    username,
    chatId,
    date: new Date().toISOString()
  };
  let allFeedback = [];
  try {
    if (fs.existsSync(FEEDBACK_FILE)) {
      const raw = fs.readFileSync(FEEDBACK_FILE, 'utf-8');
      allFeedback = JSON.parse(raw);
    }
  } catch (e) {
    // ignore, start with empty
  }
  allFeedback.push(feedback);
  fs.mkdirSync(path.dirname(FEEDBACK_FILE), { recursive: true });
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(allFeedback, null, 2));
  return feedback;
};

export const getAllGlobalFeedback = async () => {
  if (!fs.existsSync(FEEDBACK_FILE)) return [];
  const raw = fs.readFileSync(FEEDBACK_FILE, 'utf-8');
  return JSON.parse(raw);
};
