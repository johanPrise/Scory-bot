import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Refactor helpers.js
const helpersFile = path.join(__dirname, '../src/commands/utils/helpers.js');
let helpersCode = fs.readFileSync(helpersFile, 'utf8');

const sessionCode = `
import BotSession from '../../api/models/BotSession.js';

const normalizeSessionUserId = (userId) => String(userId);

/**
 * Interface persistante (MongoDB) pour les sessions conversationnelles
 */
export const userSessions = {
  get: async (userId) => {
    const sessionUserId = normalizeSessionUserId(userId);
    const session = await BotSession.findOne({ userId: sessionUserId });
    return session ? { step: session.step, ...session.data } : null;
  },
  set: async (userId, data) => {
    const sessionUserId = normalizeSessionUserId(userId);
    const step = data.step;
    const { step: _, ...otherData } = data;
    await BotSession.findOneAndUpdate(
      { userId: sessionUserId },
      { userId: sessionUserId, step, data: otherData },
      { upsert: true, new: true }
    );
  },
  delete: async (userId) => {
    await BotSession.deleteOne({ userId: normalizeSessionUserId(userId) });
  }
};
`;

helpersCode = helpersCode.replace(
  /\/\*\*\n \* In-memory store for conversational user sessions[\s\S]*?export const userSessions = new Map\(\);/,
  sessionCode.trim()
);
fs.writeFileSync(helpersFile, helpersCode);

// Refactor index.js
const indexFile = path.join(__dirname, '../src/commands/index.js');
let indexCode = fs.readFileSync(indexFile, 'utf8');
indexCode = indexCode.replaceAll('const session = userSessions.get(userId);', 'const session = await userSessions.get(userId);');
indexCode = indexCode.replaceAll('userSessions.delete(userId);', 'await userSessions.delete(userId);');
fs.writeFileSync(indexFile, indexCode);

// Refactor createActivityWithButtons.js
const btnFile = path.join(__dirname, '../src/commands/activities/createActivityWithButtons.js');
let btnCode = fs.readFileSync(btnFile, 'utf8');
btnCode = btnCode.replaceAll('userSessions.set(userId, ', 'await userSessions.set(userId, ');
fs.writeFileSync(btnFile, btnCode);

console.log('Session Refactor Done');
