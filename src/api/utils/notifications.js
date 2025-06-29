import { bot } from '../../config/bot.js';
import User from '../models/User.js';

const ADMIN_TELEGRAM_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID || '1222647766';

// Helper générique pour envoyer une notification Telegram à un utilisateur
export async function sendTelegramNotificationToUser(userId, message) {
  if (!userId && !ADMIN_TELEGRAM_CHAT_ID) return;
  if (!message) return;
  let chatId = null;
  if (userId) {
    const user = await User.findById(userId);
    if (user && user.telegram && user.telegram.id) {
      chatId = user.telegram.id;
    }
  }
  // Fallback sur l'admin si pas de chatId utilisateur
  if (!chatId) chatId = ADMIN_TELEGRAM_CHAT_ID;
  try {
    if (chatId) {
      await bot.sendMessage(chatId, message);
    }
  } catch (err) {
    // Optionnel: log
  }
}

// Helper pour notifier les membres/admins d'une activité (Socket.IO + Telegram)
export async function notifyActivityMembers(req, activity, eventType) {
  const io = req.app.get('io');
  if (io && activity) {
    // Notifier le créateur
    io.to(`user:${activity.createdBy}`).emit('activity:change', {
      activityId: activity._id,
      eventType,
      name: activity.name,
    });
    await sendTelegramNotificationToUser(
      activity.createdBy,
      `📢 Activité "${activity.name}" ${eventType === 'created' ? 'créée' : eventType === 'updated' ? 'modifiée' : 'supprimée'}.`
    );
    // Notifier les admins de l'équipe si applicable
    if (activity.teamId && activity.teamId.members) {
      for (const member of activity.teamId.members) {
        if (member.isAdmin) {
          io.to(`user:${member.userId}`).emit('activity:change', {
            activityId: activity._id,
            eventType,
            name: activity.name,
          });
          await sendTelegramNotificationToUser(
            member.userId,
            `📢 Activité "${activity.name}" ${eventType === 'created' ? 'créée' : eventType === 'updated' ? 'modifiée' : 'supprimée'} dans votre équipe.`
          );
        }
      }
    }
  }
}

// Helper pour notifier les membres/admins d'une activité pour les sous-activités (Socket.IO + Telegram)
export async function notifyActivityMembersSubActivity(req, activity, eventType, subActivity) {
  const io = req.app.get('io');
  if (io && activity) {
    // Notifier le créateur
    io.to(`user:${activity.createdBy}`).emit('subactivity:change', {
      activityId: activity._id,
      eventType,
      subActivity: subActivity ? {
        id: subActivity._id,
        name: subActivity.name,
        description: subActivity.description,
        maxScore: subActivity.maxScore,
      } : undefined,
    });
    await sendTelegramNotificationToUser(
      activity.createdBy,
      `📢 Sous-activité "${subActivity?.name || ''}" ${eventType === 'created' ? 'créée' : eventType === 'updated' ? 'modifiée' : 'supprimée'} dans l'activité "${activity.name}".`
    );
    // Notifier les admins de l'équipe si applicable
    if (activity.teamId && activity.teamId.members) {
      for (const member of activity.teamId.members) {
        if (member.isAdmin) {
          io.to(`user:${member.userId}`).emit('subactivity:change', {
            activityId: activity._id,
            eventType,
            subActivity: subActivity ? {
              id: subActivity._id,
              name: subActivity.name,
              description: subActivity.description,
              maxScore: subActivity.maxScore,
            } : undefined,
          });
          await sendTelegramNotificationToUser(
            member.userId,
            `📢 Sous-activité "${subActivity?.name || ''}" ${eventType === 'created' ? 'créée' : eventType === 'updated' ? 'modifiée' : 'supprimée'} dans l'activité "${activity.name}" de votre équipe.`
          );
        }
      }
    }
  }
}

// Notifier tous les admins en temps réel (Socket.IO + Telegram)
export async function notifyAdminsNewFeedback(req, feedback) {
  const io = req.app.get('io');
  const User = (await import('../models/User.js')).default;
  const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
  for (const admin of admins) {
    if (io) {
      io.to(`user:${admin._id}`).emit('feedback:new', {
        feedbackId: feedback._id,
        message: feedback.message,
        type: feedback.type,
        createdAt: feedback.createdAt,
      });
    }
    // Notification Telegram à chaque admin
    if (admin.telegram && admin.telegram.id) {
      await sendTelegramNotificationToUser(
        admin._id,
        `📝 Nouveau feedback reçu : ${feedback.message}`
      );
    }
  }
}

// Notifier un utilisateur pour le statut d'un score (Socket.IO + Telegram)
export async function notifyUserScoreStatus(req, score, status, extra = {}) {
  const io = req.app.get('io');
  if (io && score.user) {
    io.to(`user:${score.user}`).emit('score:status', {
      scoreId: score._id,
      status,
      ...extra
    });
  }
  // Notification Telegram
  let message;
  if (status === 'approved') {
    message = `✅ Votre score pour l'activité "${score.activity}" a été approuvé !`;
  } else if (status === 'rejected') {
    message = `❌ Votre score pour l'activité "${score.activity}" a été rejeté. Raison : ${extra.reason || 'Non précisée'}`;
  }
  if (message) {
    await sendTelegramNotificationToUser(score.user, message);
  }
}

// Notifier tous les membres d'une équipe pour un nouveau score (Socket.IO + Telegram)
export async function notifyTeamMembersNewScore(req, teamId, score) {
  const io = req.app.get('io');
  if (io && teamId) {
    const Team = (await import('../models/Team.js')).default;
    const team = await Team.findById(teamId);
    if (team && Array.isArray(team.members)) {
      for (const member of team.members) {
        io.to(`user:${member.userId}`).emit('score:new', {
          scoreId: score._id,
          teamId: teamId,
          value: score.value,
          activity: score.activity,
          createdAt: score.createdAt,
        });
        // Notification Telegram à chaque membre
        await sendTelegramNotificationToUser(
          member.userId,
          `🏅 Un nouveau score a été ajouté à votre équipe "${team.name}" !`
        );
      }
    }
  }
}

// Notifier un utilisateur ajouté à une équipe (Socket.IO + Telegram)
export async function notifyUserAddedToTeam(req, userId, team) {
  const io = req.app.get('io');
  if (io && userId && team) {
    io.to(`user:${userId}`).emit('team:added', {
      teamId: team._id,
      teamName: team.name,
    });
  }
  // Notification Telegram
  await sendTelegramNotificationToUser(
    userId,
    `🎉 Vous avez été ajouté à l'équipe "${team.name}" !`
  );
}

// Notifier tous les participants d'une activité à la fin d'un timer (Socket.IO + Telegram)
export async function notifyActivityParticipantsTimerEnded(req, activityId, timer) {
  const io = req.app.get('io');
  if (io && activityId) {
    const Activity = (await import('../models/activity.js')).Activity;
    const activity = await Activity.findById(activityId);
    if (activity && activity.stats && activity.stats.totalParticipants > 0) {
      // Récupérer tous les scores pour cette activité pour trouver les participants
      const Score = (await import('../models/Score.js')).default;
      const scores = await Score.find({ activity: activityId });
      const userIds = [...new Set(scores.map(s => s.user).filter(Boolean))];
      for (const userId of userIds) {
        io.to(`user:${userId}`).emit('timer:ended', {
          activityId,
          timerId: timer._id,
          timerName: timer.name,
          endedAt: timer.endTime,
        });
        // Notification Telegram à chaque participant
        await sendTelegramNotificationToUser(
          userId,
          `⏰ Le timer "${timer.name}" pour l'activité "${activity.name}" est terminé !`
        );
      }
    }
  }
}
