import React, { useEffect, useState } from 'react';
import { getDashboardStats } from '../../api';
import {
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Card, 
  CardContent,
  Divider,
  Button
} from '@mui/material';
import {
  GroupWork as GroupWorkIcon,
  People as PeopleIcon,
  BarChart as BarChartIcon,
  Timeline as TimelineIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';

// Composant de carte de statistique
const StatCard = ({ title, value, icon: Icon, color = 'primary', to }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" mb={2}>
        <Box
          sx={{
            backgroundColor: `${color}.light`,
            color: `${color}.contrastText`,
            width: 48,
            height: 48,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 2,
          }}
        >
          <Icon fontSize="large" />
        </Box>
        <Box>
          <Typography variant="h4" component="div">
            {value}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {title}
          </Typography>
        </Box>
      </Box>
      {to && (
        <Button 
          size="small" 
          endIcon={<ArrowForwardIcon />}
          sx={{ mt: 1 }}
          href={to}
        >
          Voir plus
        </Button>
      )}
    </CardContent>
  </Card>
);

const CreatorDashboard = () => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStats();
        setStats([
          { 
            title: 'Groupes actifs', 
            value: data.activeGroups, 
            icon: GroupWorkIcon, 
            color: 'primary',
            to: '/creator/groups'
          },
          { 
            title: 'Utilisateurs', 
            value: data.totalUsers, 
            icon: PeopleIcon, 
            color: 'secondary',
            to: '/creator/users'
          },
          { 
            title: 'Activités ce mois', 
            value: data.monthlyActivities, 
            icon: BarChartIcon, 
            color: 'success',
            to: '/creator/stats'
          },
          { 
            title: 'Croissance', 
            value: `+${data.growth}%`, 
            icon: TimelineIcon, 
            color: 'warning'
          },
        ]);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Tableau de bord du créateur
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Aperçu global de l'utilisation de votre application
        </Typography>
      </Box>

      {/* Cartes de statistiques */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Graphique d'activité */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">Activité récente</Typography>
              <Button size="small" color="primary">
                Voir tout
              </Button>
            </Box>
            <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="textSecondary">
                Graphique d'activité à venir
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Derniers groupes actifs */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">Groupes récents</Typography>
              <Button size="small" color="primary" href="/creator/groups">
                Tous voir
              </Button>
            </Box>
            <Box>
              {[1, 2, 3].map((item) => (
                <Box key={item} mb={2}>
                  <Typography variant="subtitle1">Groupe {item}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Dernière activité: il y a {item} jour{item > 1 ? 's' : ''}
                  </Typography>
                  {item < 3 && <Divider sx={{ mt: 1 }} />}
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Section des statistiques avancées */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Statistiques avancées
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Utilisation par jour de la semaine
                </Typography>
                <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography color="textSecondary">Graphique à venir</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Répartition des utilisateurs
                </Typography>
                <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography color="textSecondary">Graphique à venir</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Activité récente
                </Typography>
                <Box sx={{ height: 200, overflow: 'auto' }}>
                  {[1, 2, 3, 4, 5].map((item) => (
                    <Box key={item} mb={1}>
                      <Typography variant="body2">Nouvelle activité dans le groupe {item}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        Il y a {item} heure{item > 1 ? 's' : ''}
                      </Typography>
                      {item < 5 && <Divider sx={{ my: 1 }} />}
                    </Box>
                  ))}
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CreatorDashboard;
