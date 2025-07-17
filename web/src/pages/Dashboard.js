import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTelegram } from '../context/TelegramContext';
import { dashboard, scores } from '../api';
import TelegramButton from '../components/TelegramButton';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Skeleton
} from '@mui/material';
import {
  SportsSoccer as SportsSoccerIcon,
  EmojiEvents as EmojiEventsIcon,
  Group as GroupIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon,
  Star as StarIcon
} from '@mui/icons-material';
import { useNotification } from '../context/NotificationContext';

const StatCard = ({ title, value, icon: Icon, color, loading = false, subtitle }) => (
  <Grid item xs={12} sm={6} md={3}>
    <Card elevation={3} sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
        <Box
          sx={{
            backgroundColor: `${color}.light`,
            color: `${color}.contrastText`,
            width: 56,
            height: 56,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
          }}
        >
          <Icon fontSize="large" />
        </Box>
        <Typography component="h3" variant="h6" color="textPrimary" gutterBottom align="center">
          {title}
        </Typography>
        {loading ? (
          <Skeleton variant="text" width={60} height={40} />
        ) : (
          <Typography component="p" variant="h4" color="primary" align="center">
            {value}
          </Typography>
        )}
        {subtitle && (
          <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 1 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  </Grid>
);

const RecentActivityItem = ({ activity }) => {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'score':
      case 'personal_score':
        return <EmojiEventsIcon color="primary" />;
      case 'team_score':
        return <GroupIcon color="secondary" />;
      case 'team':
        return <GroupIcon color="success" />;
      case 'activity':
        return <SportsSoccerIcon color="warning" />;
      default:
        return <TimelineIcon />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'score':
      case 'personal_score':
        return 'primary';
      case 'team_score':
        return 'secondary';
      case 'team':
        return 'success';
      case 'activity':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <ListItem>
      <ListItemAvatar>
        <Avatar sx={{ bgcolor: 'transparent' }}>
          {getActivityIcon(activity.type)}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={activity.description}
        secondary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Typography variant="caption" color="textSecondary">
              {new Date(activity.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Typography>
            {activity.activity && (
              <Chip 
                label={activity.activity} 
                size="small" 
                variant="outlined"
                color={getActivityColor(activity.type)}
              />
            )}
            {activity.team && (
              <Chip 
                label={activity.team} 
                size="small" 
                variant="outlined"
                color="default"
              />
            )}
          </Box>
        }
      />
    </ListItem>
  );
};



const Dashboard = () => {
  const { currentUser, hasPermission } = useAuth();
  const { telegram, user } = useTelegram();
  const isTelegram = !!telegram;
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('month');
  const [performerScope, setPerformerScope] = useState('individual');
  const { notify } = useNotification();

  useEffect(() => {
    loadDashboardData();
  }, [period, performerScope]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsData, activityData] = await Promise.all([
        dashboard.getStats(period),
        dashboard.getRecentActivity(10),
        
      ]);

      setStats(statsData.stats);
      setRecentActivity(activityData.activities);
      
    } catch (err) {
      console.error('Erreur lors du chargement du dashboard:', err);
      setError(err.message || 'Erreur lors du chargement des données');
      notify(err.message || 'Erreur lors du chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (event) => {
    setPeriod(event.target.value);
  };

  const handleScopeChange = (event) => {
    setPerformerScope(event.target.value);
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  // Préparer les statistiques pour l'affichage
  const getStatsCards = () => {
    if (!stats) return [];

    const cards = [];

    // Statistiques personnelles (toujours affichées)
    if (stats.personal) {
      cards.push(
        {
          title: 'Mes scores',
          value: stats.personal.scores || 0,
          icon: EmojiEventsIcon,
          color: 'primary',
          subtitle: `${stats.personal.totalScore || 0} points total`
        },
        {
          title: 'Mes équipes',
          value: stats.personal.teamsCount || 0,
          icon: GroupIcon,
          color: 'secondary',
          subtitle: stats.personal.ranking?.position ? `#${stats.personal.ranking.position}` : 'Non classé'
        }
      );
    }

    // Statistiques globales (pour les admins)
    if (hasPermission('view_admin_stats') && stats.overview) {
      cards.push(
        {
          title: 'Utilisateurs',
          value: stats.overview.totalUsers || 0,
          icon: PersonIcon,
          color: 'success',
          subtitle: `${stats.overview.activeUsers || 0} actifs`
        },
        {
          title: 'Total scores',
          value: stats.overview.totalScores || 0,
          icon: TimelineIcon,
          color: 'warning',
          subtitle: 'Tous les utilisateurs'
        }
      );
    } else {
      // Pour les utilisateurs normaux, afficher d'autres stats personnelles
      cards.push(
        {
          title: 'Activités créées',
          value: stats.personal?.activitiesCreated || 0,
          icon: SportsSoccerIcon,
          color: 'success'
        },
        {
          title: 'Scores équipe',
          value: stats.personal?.teamScores || 0,
          icon: TrendingUpIcon,
          color: 'warning'
        }
      );
    }

    return cards;
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }} className={isTelegram ? 'telegram-theme' : ''}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Tableau de bord
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Bienvenue {user?.first_name || currentUser?.firstName || currentUser?.username} !
          </Typography>
        </Box>
        
        {isTelegram ? (
          <TelegramButton onClick={() => telegram.close()}>
            Fermer
          </TelegramButton>
        ) : (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Période</InputLabel>
            <Select value={period} onChange={handlePeriodChange} label="Période">
              <MenuItem value="day">Aujourd'hui</MenuItem>
              <MenuItem value="week">Cette semaine</MenuItem>
              <MenuItem value="month">Ce mois</MenuItem>
              <MenuItem value="year">Cette année</MenuItem>
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Cartes de statistiques */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {getStatsCards().map((stat, index) => (
          <StatCard key={index} {...stat} loading={loading} />
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Activité récente */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Activité récente
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : recentActivity.length > 0 ? (
                <List sx={{ maxHeight: 320, overflow: 'auto' }}>
                  {recentActivity.map((activity, index) => (
                    <RecentActivityItem key={index} activity={activity} />
                  ))}
                </List>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                  <Typography color="textSecondary">
                    Aucune activité récente
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        
      </Grid>
    </Box>
  );
};

export default Dashboard;