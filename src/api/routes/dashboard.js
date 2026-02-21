import express from 'express';
import User from '../models/User.js';
import Team from '../models/Team.js';
import { Activity } from '../models/activity.js';
import Score from '../models/Score.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

/**
 * GET /api/dashboard
 * Récupérer les données complètes du dashboard (stats + activité récente)
 */
router.get('/', asyncHandler(async (req, res) => {
  const { period = 'month' } = req.query;
  const userId = req.userId;

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

  const dateFilter = startDate ? { createdAt: { $gte: startDate } } : {};

  // Statistiques personnelles
  const user = await User.findById(userId).populate('teams.team', 'name');
  const [userScores, userActivities, userRanking, recentScores] = await Promise.all([
    Score.countDocuments({ user: userId, status: 'approved', ...dateFilter }),
    Activity.countDocuments({ createdBy: userId, ...dateFilter }),
    getUserRankingForDashboard(userId, period),
    Score.find({ user: userId, status: 'approved' })
      .populate('activity', 'name description')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()
  ]);

  res.json({
    stats: {
      personal: {
        scores: userScores,
        activitiesCreated: userActivities,
        teamsCount: user.teams?.length || 0,
        totalScore: user.stats?.totalScore || 0,
        ranking: userRanking
      }
    },
    recentScores,
    period,
    generatedAt: new Date().toISOString()
  });
}));

/**
 * Fonction utilitaire pour obtenir le classement d'un utilisateur (dashboard)
 */
async function getUserRankingForDashboard(userId, period = 'month') {
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

  const match = {
    status: 'approved',
    context: 'individual',
    user: { $exists: true },
    ...(startDate && { createdAt: { $gte: startDate } })
  };

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: '$user',
        totalNormalizedScore: { $sum: '$normalizedScore' }
      }
    },
    { $sort: { totalNormalizedScore: -1 } },
    {
      $group: {
        _id: null,
        users: { $push: { userId: '$_id', score: '$totalNormalizedScore' } }
      }
    }
  ];

  const result = await Score.aggregate(pipeline);
  
  if (!result.length) {
    return { position: null, total: 0 };
  }

  const users = result[0].users;
  const userIndex = users.findIndex(u => u.userId.toString() === userId.toString());
  
  return {
    position: userIndex >= 0 ? userIndex + 1 : null,
    total: users.length,
    score: userIndex >= 0 ? users[userIndex].score : 0
  };
}

/**
 * GET /api/dashboard/stats
 * Récupérer les statistiques générales du dashboard
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const { period = 'month' } = req.query;
  const userId = req.userId;
  const userRole = req.user.role;

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
      startDate = null; // Toutes les données
  }

  const dateFilter = startDate ? { createdAt: { $gte: startDate } } : {};

  let stats = {};

  // Statistiques pour les admins
  if (['admin', 'superadmin'].includes(userRole)) {
    const [
      totalUsers,
      activeUsers,
      totalTeams,
      totalActivities,
      totalScores,
      recentUsers,
      recentTeams,
      recentActivities
    ] = await Promise.all([
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ 
        status: 'active', 
        lastLogin: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
      }),
      Team.countDocuments(),
      Activity.countDocuments(),
      Score.countDocuments({ status: 'approved' }),
      User.countDocuments({ ...dateFilter, status: 'active' }),
      Team.countDocuments(dateFilter),
      Activity.countDocuments(dateFilter)
    ]);

    stats = {
      overview: {
        totalUsers,
        activeUsers,
        totalTeams,
        totalActivities,
        totalScores
      },
      recent: {
        newUsers: recentUsers,
        newTeams: recentTeams,
        newActivities: recentActivities
      }
    };
  }

  // Statistiques personnelles pour tous les utilisateurs
  const user = await User.findById(userId).populate('teams.team', 'name');
  
  const userTeamIds = user.teams.map(t => t.team._id);
  
  const [
    userScores,
    userTeamScores,
    userActivities,
    userRanking
  ] = await Promise.all([
    Score.countDocuments({ 
      user: userId, 
      status: 'approved',
      ...dateFilter
    }),
    Score.countDocuments({ 
      team: { $in: userTeamIds }, 
      status: 'approved',
      ...dateFilter
    }),
    Activity.countDocuments({ 
      createdBy: userId,
      ...dateFilter
    }),
    getUserRankingForDashboard(userId, period),
  ]);

  const personalStats = {
    scores: userScores,
    teamScores: userTeamScores,
    activitiesCreated: userActivities,
    teamsCount: user.teams.length,
    totalScore: user.stats.totalScore,
    ranking: userRanking
  };

  res.json({
    stats: {
      ...stats,
      personal: personalStats
    },
    period,
    generatedAt: new Date().toISOString()
  });
}));

/**
 * GET /api/dashboard/recent-activity
 * Récupérer l'activité récente
 */
router.get('/recent-activity', asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const userId = req.userId;
  const userRole = req.user.role;

  let activities = [];

  if (['admin', 'superadmin'].includes(userRole)) {
    // Activité globale pour les admins
    const [recentScores, recentTeams, recentActivities] = await Promise.all([
      Score.find({ status: 'approved' })
        .populate('user', 'username firstName lastName')
        .populate('team', 'name')
        .populate('activity', 'name')
        .sort({ createdAt: -1 })
        .limit(Number.parseInt(limit) / 3),
      
      Team.find()
        .populate('createdBy', 'username firstName lastName')
        .sort({ createdAt: -1 })
        .limit(Number.parseInt(limit) / 3),
      
      Activity.find()
        .populate('createdBy', 'username firstName lastName')
        .sort({ createdAt: -1 })
        .limit(Number.parseInt(limit) / 3)
    ]);

    // Formater les activités
    activities = [
      ...recentScores.map(score => ({
        type: 'score',
        id: score._id,
        description: `${score.user?.username || 'Utilisateur'} a obtenu ${score.value} points`,
        activity: score.activity?.name,
        team: score.team?.name,
        createdAt: score.createdAt,
        user: score.user
      })),
      ...recentTeams.map(team => ({
        type: 'team',
        id: team._id,
        description: `Équipe "${team.name}" créée`,
        createdAt: team.createdAt,
        user: team.createdBy
      })),
      ...recentActivities.map(activity => ({
        type: 'activity',
        id: activity._id,
        description: `Activité "${activity.name}" créée`,
        createdAt: activity.createdAt,
        user: activity.createdBy
      }))
    ];
  } else {
    // Activité personnelle pour les utilisateurs normaux
    const user = await User.findById(userId);
    const userTeamIds = user.teams.map(t => t.team);

    const [userScores, teamScores] = await Promise.all([
      Score.find({ 
        user: userId, 
        status: 'approved' 
      })
        .populate('activity', 'name')
        .sort({ createdAt: -1 })
        .limit(Number.parseInt(limit) / 2),
      
      Score.find({ 
        team: { $in: userTeamIds }, 
        status: 'approved' 
      })
        .populate('user', 'username firstName lastName')
        .populate('team', 'name')
        .populate('activity', 'name')
        .sort({ createdAt: -1 })
        .limit(Number.parseInt(limit) / 2)
    ]);

    activities = [
      ...userScores.map(score => ({
        type: 'personal_score',
        id: score._id,
        description: `Vous avez obtenu ${score.value} points`,
        activity: score.activity?.name,
        createdAt: score.createdAt
      })),
      ...teamScores.map(score => ({
        type: 'team_score',
        id: score._id,
        description: `${score.user?.username || 'Membre'} a obtenu ${score.value} points pour l'équipe ${score.team?.name}`,
        activity: score.activity?.name,
        team: score.team?.name,
        createdAt: score.createdAt,
        user: score.user
      }))
    ];
  }

  // Trier par date et limiter
  activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  activities = activities.slice(0, Number.parseInt(limit));

  res.json({
    activities,
    total: activities.length
  });
}));

export default router;