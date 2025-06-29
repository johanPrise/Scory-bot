import { Activity } from '../models/activity.js';
import Score from '../models/Score.js';
import User from '../models/User.js';
import Team from '../models/Team.js';
import QuickChart from 'quickchart-js';
import logger from '../../utils/logger.js';

export const generateStatistics = async (activityId) => {
  const activity = await Activity.findById(activityId);
  if (!activity) {
    throw new Error('Activity not found');
  }

  let totalScores = {};
  let participationCount = {};

  activity.subActivities.forEach(sa => {
    sa.scores.forEach((score, participant) => {
      totalScores[participant] = (totalScores[participant] || 0) + score;
      participationCount[participant] = (participationCount[participant] || 0) + 1;
    });
  });

  const stats = {
    totalParticipants: activity.participants.length,
    averageScore: Object.values(totalScores).reduce((a, b) => a + b, 0) / activity.participants.length,
    highestScore: Math.max(...Object.values(totalScores)),
    lowestScore: Math.min(...Object.values(totalScores)),
    mostActiveParticipant: Object.entries(participationCount).sort((a, b) => b[1] - a[1])[0][0],
  };

  return `
    Statistiques pour l'activité "${activity.name}":
    Nombre total de participants: ${stats.totalParticipants}
    Score moyen: ${stats.averageScore.toFixed(2)}
    Score le plus élevé: ${stats.highestScore}
    Score le plus bas: ${stats.lowestScore}
    Participant le plus actif: ${stats.mostActiveParticipant}
  `;
};

export const generateGraph = async (activityId) => {
  const activity = await Activity.findById(activityId);
  if (!activity) {
    throw new Error('Activity not found');
  }

  let totalScores = {};
  activity.subActivities.forEach(sa => {
    sa.scores.forEach((score, participant) => {
      totalScores[participant] = (totalScores[participant] || 0) + score;
    });
  });

  const participants = Object.keys(totalScores);
  const scores = Object.values(totalScores);

  const chart = new QuickChart();
  chart.setConfig({
    type: 'bar',
    data: {
      labels: participants,
      datasets: [{
        label: 'Scores totaux',
        data: scores,
        backgroundColor: 'rgba(54, 162, 235, 0.8)'
      }]
    },
    options: {
      title: {
        display: true,
        text: `Scores de l'activité "${activity.name}"`
      },
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: true
          }
        }]
      }
    }
  });

  return chart.getUrl();
};

/**
 * Récupère les statistiques selon le type demandé
 * @param {string} type - Type de statistiques ('user', 'activity', 'team')
 * @param {string} userId - ID de l'utilisateur
 * @param {string} chatId - ID du chat
 * @returns {Promise<Object>} Objet contenant les statistiques
 */
export const getStatistics = async (type, userId, chatId) => {
  try {
    logger.info(`Récupération des statistiques de type: ${type} pour utilisateur: ${userId}`);
    
    switch (type) {
      case 'user':
        return await getUserStatistics(userId);
      case 'activity':
        return await getActivityStatistics(chatId);
      case 'team':
        return await getTeamStatistics(userId, chatId);
      default:
        throw new Error(`Type de statistiques non supporté: ${type}`);
    }
  } catch (error) {
    logger.error(`Erreur lors de la récupération des statistiques ${type}:`, error);
    throw error;
  }
};

/**
 * Récupère les statistiques d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} Statistiques de l'utilisateur
 */
const getUserStatistics = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('Utilisateur non trouvé');
  }

  // Récupérer tous les scores de l'utilisateur
  const scores = await Score.find({ 
    user: userId, 
    status: 'approved' 
  }).populate('activity', 'name');

  // Calculer les dates pour les filtres
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Statistiques générales
  const totalScore = scores.reduce((sum, score) => sum + score.value, 0);
  const totalActivities = scores.length;
  const averageScore = totalActivities > 0 ? (totalScore / totalActivities).toFixed(2) : 0;

  // Statistiques de la semaine
  const weeklyScores = scores.filter(score => score.createdAt >= startOfWeek);
  const weeklyPoints = weeklyScores.reduce((sum, score) => sum + score.value, 0);
  const weeklyActivities = weeklyScores.length;

  // Statistiques du mois
  const monthlyScores = scores.filter(score => score.createdAt >= startOfMonth);
  const monthlyPoints = monthlyScores.reduce((sum, score) => sum + score.value, 0);
  const monthlyActivities = monthlyScores.length;

  // Meilleur score
  const bestScore = scores.length > 0 ? Math.max(...scores.map(s => s.value)) : 0;

  // Activité la plus fréquente
  const activityCounts = {};
  scores.forEach(score => {
    const activityName = score.activity?.name || 'Activité inconnue';
    activityCounts[activityName] = (activityCounts[activityName] || 0) + 1;
  });
  
  const mostFrequentActivity = Object.keys(activityCounts).length > 0 
    ? Object.entries(activityCounts).sort((a, b) => b[1] - a[1])[0][0]
    : 'Aucune';

  return {
    'Nom': user.firstName || user.username || 'Utilisateur',
    'Score total': `${totalScore} points`,
    'Nombre d\'activités': totalActivities,
    'Score moyen': `${averageScore} points`,
    'Meilleur score': `${bestScore} points`,
    'Points cette semaine': `${weeklyPoints} points`,
    'Activités cette semaine': weeklyActivities,
    'Points ce mois': `${monthlyPoints} points`,
    'Activités ce mois': monthlyActivities,
    'Activité favorite': mostFrequentActivity
  };
};

/**
 * Récupère les statistiques des activités
 * @param {string} chatId - ID du chat
 * @returns {Promise<Object>} Statistiques des activités
 */
const getActivityStatistics = async (chatId) => {
  // Récupérer toutes les activités
  const activities = await Activity.find().lean();
  
  // Récupérer tous les scores
  const scores = await Score.find({ status: 'approved' }).populate('activity', 'name');

  const totalActivities = activities.length;
  const totalScores = scores.length;
  const totalPoints = scores.reduce((sum, score) => sum + score.value, 0);
  const averagePoints = totalScores > 0 ? (totalPoints / totalScores).toFixed(2) : 0;

  // Activité la plus populaire
  const activityCounts = {};
  scores.forEach(score => {
    const activityName = score.activity?.name || 'Activité inconnue';
    activityCounts[activityName] = (activityCounts[activityName] || 0) + 1;
  });
  
  const mostPopularActivity = Object.keys(activityCounts).length > 0 
    ? Object.entries(activityCounts).sort((a, b) => b[1] - a[1])[0][0]
    : 'Aucune';

  // Statistiques récentes (7 derniers jours)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentScores = scores.filter(score => score.createdAt >= weekAgo);
  const recentActivities = recentScores.length;
  const recentPoints = recentScores.reduce((sum, score) => sum + score.value, 0);

  return {
    'Total activités créées': totalActivities,
    'Total participations': totalScores,
    'Points totaux distribués': `${totalPoints} points`,
    'Moyenne par participation': `${averagePoints} points`,
    'Activité la plus populaire': mostPopularActivity,
    'Participations cette semaine': recentActivities,
    'Points cette semaine': `${recentPoints} points`
  };
};

/**
 * Récupère les statistiques des équipes
 * @param {string} userId - ID de l'utilisateur
 * @param {string} chatId - ID du chat
 * @returns {Promise<Object>} Statistiques des équipes
 */
const getTeamStatistics = async (userId, chatId) => {
  // Récupérer toutes les équipes
  const teams = await Team.find().lean();
  
  // Récupérer les scores d'équipe
  const teamScores = await Score.find({ 
    context: 'team', 
    status: 'approved' 
  }).populate('team', 'name');

  const totalTeams = teams.length;
  const totalTeamActivities = teamScores.length;
  const totalTeamPoints = teamScores.reduce((sum, score) => sum + score.value, 0);

  // Équipe avec le plus de points
  const teamPoints = {};
  teamScores.forEach(score => {
    const teamName = score.team?.name || 'Équipe inconnue';
    teamPoints[teamName] = (teamPoints[teamName] || 0) + score.value;
  });
  
  const topTeam = Object.keys(teamPoints).length > 0 
    ? Object.entries(teamPoints).sort((a, b) => b[1] - a[1])[0][0]
    : 'Aucune';

  // Vérifier si l'utilisateur fait partie d'une équipe
  const userTeam = teams.find(team => 
    team.members && team.members.some(member => member.toString() === userId)
  );

  let userTeamStats = {};
  if (userTeam) {
    const userTeamScores = teamScores.filter(score => 
      score.team && score.team._id.toString() === userTeam._id.toString()
    );
    const userTeamPoints = userTeamScores.reduce((sum, score) => sum + score.value, 0);
    
    userTeamStats = {
      'Votre équipe': userTeam.name,
      'Points de votre équipe': `${userTeamPoints} points`,
      'Activités de votre équipe': userTeamScores.length
    };
  }

  return {
    'Nombre d\'équipes': totalTeams,
    'Total activités d\'équipe': totalTeamActivities,
    'Points totaux équipes': `${totalTeamPoints} points`,
    'Équipe leader': topTeam,
    ...userTeamStats
  };
};