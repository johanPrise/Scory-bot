import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { dashboard as dashboardAPI } from '../../api';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Paper
} from '@mui/material';
import {
  People as PeopleIcon,
  Group as GroupIcon,
  Score as ScoreIcon,
  TrendingUp as TrendingUpIcon,
  Event as EventIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" mb={1}>
        <Box
          sx={{
            backgroundColor: `${color}.light`,
            color: `${color}.contrastText`,
            borderRadius: '50%',
            width: 56,
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 2
          }}
        >
          <Icon fontSize="large" />
        </Box>
        <Box>
          <Typography variant="h4" component="div">
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const CreatorDashboard = () => {
  const { currentUser } = useAuth();
  const { notify } = useNotification();

  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGroups: 0,
    totalScores: 0,
    activeUsers: 0,
    scoreTrend: [],
    recentActivity: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Récupération des statistiques du tableau de bord
        const [statsData, activityData] = await Promise.all([
          dashboardAPI.getStats('month'),
          dashboardAPI.getRecentActivity(5)
        ]);

        setStats({
          totalUsers: statsData.totalUsers || 0,
          totalGroups: statsData.totalGroups || 0,
          totalScores: statsData.totalScores || 0,
          activeUsers: statsData.activeUsers || 0,
          scoreTrend: statsData.scoreTrend || [],
          recentActivity: activityData || []
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        notify('Erreur lors du chargement des données du tableau de bord', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser, notify]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Tableau de bord
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Utilisateurs"
            value={stats.totalUsers}
            icon={PeopleIcon}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Groupes"
            value={stats.totalGroups}
            icon={GroupIcon}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Scores"
            value={stats.totalScores}
            icon={ScoreIcon}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Utilisateurs actifs"
            value={stats.activeUsers}
            icon={TrendingUpIcon}
            color="info"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Évolution des scores (30 derniers jours)
            </Typography>
            <Box sx={{ height: 300, mt: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stats.scoreTrend}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="scores"
                    name="Scores"
                    stroke="#1976d2"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Activité récente
            </Typography>
            <Box sx={{ mt: 2 }}>
              {stats.recentActivity.length > 0 ? (
                <Box>
                  {stats.recentActivity.map((activity, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        mb: 2,
                        p: 1,
                        borderRadius: 1,
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <EventIcon color="action" sx={{ mr: 1 }} />
                      <Box>
                        <Typography variant="body2">
                          {activity.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(activity.timestamp).toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Aucune activité récente
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default CreatorDashboard;
