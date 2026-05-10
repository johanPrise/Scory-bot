import { bot } from '../config/bot.js';
import { TELEGRAM_CONFIG } from '../config/telegram.js';

// Import des utilitaires
import { userSessions, resolveUserId, trackGroup } from './utils/helpers.js';
import { setupCallbackHandlers } from './utils/callbackHandler.js';

// Import des commandes par catégorie
import * as authCommands from './auth/index.js';
import * as activityCommands from './activities/index.js';
import * as teamCommands from './teams/index.js';
import * as scoreCommands from './scores/index.js';
import * as utilityCommands from './utils/index.js';
import * as webAppCommands from './utils/webAppCommands.js';
import { createActivityWithButtons } from './activities/createActivityWithButtons.js';
import logger from '../utils/logger.js';
import { createBotCommand, wrapCommandHandler } from './utils/botCommandUtils.js';
import * as activityService from '../api/services/activityService.js';

const COMMAND_PATTERN = /^\/(\w+)(?:@(\w+))?/;
const GROUP_CHAT_TYPES = new Set(['group', 'supergroup']);
const EXTRA_COMMANDS = [
  'create_activity',
  'subscore',
  'subranking',
  'aranking',
  'shistory',
  'export',
  'feedback',
  'starttimer',
  'stoptimer',
  'deleteactivity',
  'deleteteam',
  'deletescore'
];

const isCommandMessage = (msg) => msg.text?.startsWith('/');

const buildKnownCommands = () => {
  const menuCommands = TELEGRAM_CONFIG.COMMANDS.map(c => c.command);
  return new Set([...menuCommands, ...EXTRA_COMMANDS]);
};

const trackGroupIfNeeded = async ({ msg, mongoUserId }) => {
  if (msg.chat.type === 'private' || !mongoUserId) return;
  await trackGroup(msg, mongoUserId);
};

const handleActivityNameCaptureError = async ({ err, msg, userId }) => {
  logger.error('Erreur lors de la capture du nom d\'activité:', err);
  await userSessions.delete(userId);
  await bot.sendMessage(msg.chat.id, "❌ Echec lors de la création de l'activité.");
};

const createActivityFromSession = async ({ msg, session, userId }) => {
  try {
    const chatId = msg.chat.id;
    const activityName = msg.text.trim();
    const mongoUserId = await resolveUserId(userId);

    await trackGroupIfNeeded({ msg, mongoUserId });

    await activityService.createActivity({
      name: activityName,
      description: `Type: ${session.activityType}`,
      createdBy: mongoUserId,
      chatId: chatId.toString()
    });

    await userSessions.delete(userId);

    await bot.sendMessage(
      chatId,
      `✅ Excellente nouvelle ! L'activité *${activityName}* a été créée avec succès !`,
      { parse_mode: 'Markdown' }
    );
    logger.info(`Activité créée via l'interface conversationnelle par ${userId}`);
  } catch (err) {
    await handleActivityNameCaptureError({ err, msg, userId });
  }
};

const handleConversationMessage = async (msg) => {
  const userId = msg.from.id;
  const session = await userSessions.get(userId);

  if (!session || isCommandMessage(msg)) return false;
  if (session.step !== 'waiting_activity_name') return true;

  await createActivityFromSession({ msg, session, userId });
  return true;
};

const parseCommand = (text) => {
  const commandMatch = text.match(COMMAND_PATTERN);
  if (!commandMatch) return null;

  return {
    name: commandMatch[1].toLowerCase(),
    mentionedBot: commandMatch[2]
  };
};

const shouldHandleCommandInChat = ({ msg, mentionedBot, botUsername }) => {
  if (!GROUP_CHAT_TYPES.has(msg.chat.type)) return true;
  return mentionedBot === botUsername;
};

const reportUnknownCommand = ({ msg, commandName }) => {
  bot.sendMessage(
    msg.chat.id,
    `❓ Commande /${commandName} non reconnue.\n\nTapez /help pour voir les commandes disponibles.`
  ).catch(err => logger.error('Erreur envoi commande inconnue:', err));
};

const handleUnknownCommand = ({ msg, botUsername, allKnownCommands }) => {
  if (!isCommandMessage(msg)) return;

  const command = parseCommand(msg.text);
  if (!command) return;

  const shouldHandle = shouldHandleCommandInChat({
    msg,
    mentionedBot: command.mentionedBot,
    botUsername
  });
  if (!shouldHandle) return;

  if (!allKnownCommands.has(command.name)) {
    reportUnknownCommand({ msg, commandName: command.name });
  }
};

const handleMessage = async ({ msg, botUsername, allKnownCommands }) => {
  if (!msg.text) return;

  const handledBySession = await handleConversationMessage(msg);
  if (handledBySession) return;

  handleUnknownCommand({ msg, botUsername, allKnownCommands });
};

// Configuration des commandes
export const setupCommands = async () => {
  try {
    logger.info('Configuration des commandes...');
    
    // Obtenir les informations du bot pour récupérer son username
    const botInfo = await bot.getMe();
    const botUsername = botInfo.username;
    
    // 1. Commandes d'authentification
    bot.onText(createBotCommand('start', String.raw`(?:\s+(\S+))?`), wrapCommandHandler(authCommands.start, botUsername));
    bot.onText(createBotCommand('help'), wrapCommandHandler(utilityCommands.help, botUsername));
    logger.debug('Commandes d\'authentification configurées');

    // 2. Commandes d'activités
    bot.onText(createBotCommand('createactivity', String.raw`(?:\s+(.+))?`), wrapCommandHandler(activityCommands.createActivity, botUsername));
    bot.onText(createBotCommand('create_activity'), wrapCommandHandler(createActivityWithButtons, botUsername));
    bot.onText(createBotCommand('addsubactivity', String.raw`(?:\s+(\S+)(?:\s+(.+))?)?`), wrapCommandHandler(activityCommands.addSubActivity, botUsername));
    bot.onText(createBotCommand('activities'), wrapCommandHandler(activityCommands.listActivities, botUsername));
    bot.onText(createBotCommand('history', String.raw`(?:\s+(\d+))?(?:\s+(\S+))?`), wrapCommandHandler(activityCommands.history, botUsername));
    bot.onText(createBotCommand('deleteactivity', String.raw`(?:\s+(\S+))?`), wrapCommandHandler(activityCommands.deleteActivity, botUsername));
    logger.debug('Commandes d\'activités configurées');

    // 3. Configuration des commandes de scores (y compris les commandes avancées)
    scoreCommands.setupScoreCommands(botUsername);
    logger.debug('Commandes de scores configurées');

    // 4. Commandes d'équipes
    bot.onText(createBotCommand('createteam', String.raw`(?:\s+(\S+)(?:\s+(.+))?)?`), wrapCommandHandler(teamCommands.createTeam, botUsername));
    bot.onText(createBotCommand('addtoteam', String.raw`(?:\s+(\S+)(?:\s+(\S+)(?:\s+(.+))?)?)?`), wrapCommandHandler(teamCommands.addToTeam, botUsername));
    bot.onText(createBotCommand('teamranking', String.raw`(?:\s+(\S+))?`), wrapCommandHandler(teamCommands.getTeamRanking, botUsername));
    bot.onText(createBotCommand('deleteteam', String.raw`(?:\s+(\S+))?`), wrapCommandHandler(teamCommands.deleteTeam, botUsername));
    logger.debug('Commandes d\'équipes configurées');

    // 5. Commandes utilitaires
    bot.onText(createBotCommand('stats', String.raw`(?:\s+(\S+))?`), wrapCommandHandler(utilityCommands.getStats, botUsername));
    bot.onText(createBotCommand('export', String.raw`(?:\s+(\S+))?`), wrapCommandHandler(utilityCommands.exportData, botUsername));
    bot.onText(createBotCommand('feedback', String.raw`(?:\s+(\S+)(?:\s+(.+))?)?`), wrapCommandHandler(utilityCommands.submitFeedback, botUsername));
    bot.onText(createBotCommand('starttimer', String.raw`(?:\s+(\S+)(?:\s+(\d+))?)?`), wrapCommandHandler(utilityCommands.startTimer, botUsername));
    bot.onText(createBotCommand('stoptimer', String.raw`(?:\s+(\S+))?`), wrapCommandHandler(utilityCommands.stopTimer, botUsername));
    logger.debug('Commandes utilitaires configurées');
    
    // 6. Commandes Web App
    bot.onText(createBotCommand('app'), wrapCommandHandler(webAppCommands.openApp, botUsername));
    logger.debug('Commandes Web App configurées');
    
    // Configuration des gestionnaires de callbacks
    setupCallbackHandlers();
    logger.debug('Gestionnaires de callbacks configurés');

    // 7. Handler de messages (doit être APRÈS toutes les commandes)
    const allKnownCommands = buildKnownCommands();
    
    bot.on('message', async (msg) => {
      await handleMessage({ msg, botUsername, allKnownCommands });
    });
    logger.debug('Handler de messages configuré');

    // Gestion des erreurs globales
    bot.on('polling_error', (error) => {
      logger.error('Erreur de polling:', error);
    });

    bot.on('webhook_error', (error) => {
      logger.error('Erreur de webhook:', error);
    });

    // Gestion des erreurs non capturées
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Rejet non géré:', { reason, promise });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Exception non gérée:', error);
      // Ne pas quitter en développement pour permettre le débogage
      if (process.env.NODE_ENV === 'production') process.exit(1);
    });

    logger.info('Toutes les commandes ont été configurées avec succès');
    
  } catch (error) {
    logger.error('Erreur lors de la configuration des commandes:', error);
    throw error; // Propager pour une gestion centralisée
  }
};

// Export des utilitaires pour utilisation dans les commandes
export { bot } from '../config/bot.js';
export { handleError, validateParams } from './utils/helpers.js';
