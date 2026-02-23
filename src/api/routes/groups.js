import express from 'express';
import ChatGroup from '../models/ChatGroup.js';
import { Activity } from '../models/activity.js';
import Team from '../models/Team.js';
import Score from '../models/Score.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

/**
 * GET /api/groups
 * Récupérer la liste des groupes Telegram de l'utilisateur
 * Retourne les groupes où l'utilisateur a interagi avec le bot
 */
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.userId;

  const groups = await ChatGroup.getUserGroups(userId);

  // Enrichir avec des compteurs par groupe
  const enrichedGroups = await Promise.all(
    groups.map(async (group) => {
      const chatId = group.chatId;

      const [activitiesCount, teamsCount, scoresCount] = await Promise.all([
        Activity.countDocuments({ chatId }),
        Team.countDocuments({ chatId }),
        Score.countDocuments({ 'metadata.chatId': chatId, status: 'approved' })
      ]);

      return {
        id: group._id,
        chatId: group.chatId,
        title: group.title,
        type: group.type,
        stats: {
          activities: activitiesCount,
          teams: teamsCount,
          scores: scoresCount
        },
        memberRole: group.members?.[0]?.role || 'member',
        lastSeen: group.members?.[0]?.lastSeen,
        updatedAt: group.updatedAt
      };
    })
  );

  res.json({
    groups: enrichedGroups,
    total: enrichedGroups.length
  });
}));

/**
 * GET /api/groups/:chatId
 * Récupérer les détails d'un groupe spécifique
 */
router.get('/:chatId', asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.userId;

  const group = await ChatGroup.findOne({ chatId })
    .populate('members.userId', 'username firstName lastName avatar');

  if (!group) {
    return res.status(404).json({ error: 'Groupe non trouvé' });
  }

  // Vérifier que l'utilisateur est membre
  const isMember = group.members.some(
    m => m.userId._id.toString() === userId.toString()
  );

  if (!isMember && !['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Accès non autorisé' });
  }

  // Récupérer les stats détaillées
  const [activities, teams, userScores] = await Promise.all([
    Activity.countDocuments({ chatId }),
    Team.countDocuments({ chatId }),
    Score.countDocuments({ 'metadata.chatId': chatId, user: userId, status: 'approved' })
  ]);

  res.json({
    group: {
      ...group.toObject(),
      stats: {
        activities,
        teams,
        userScores
      }
    }
  });
}));

export default router;
