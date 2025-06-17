import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Divider
} from '@mui/material';
import {
  Group as GroupIcon,
  EmojiEvents as EmojiEventsIcon,
  Scoreboard as ScoreboardIcon,
  People as PeopleIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';

const stats = [
  {
    title: 'Membres',
    value: 18,
    icon: PeopleIcon,
    color: 'primary',
  },
  {
    title: 'Équipes',
    value: 4,
    icon: GroupIcon,
    color: 'secondary',
  },
  {
    title: 'Scores enregistrés',
    value: 128,
    icon: ScoreboardIcon,
    color: 'success',
  },
  {
    title: 'Activité récente',
    value: '3 scores aujourd’hui',
    icon: BarChartIcon,
    color: 'warning',
  },
];

const GroupDashboard = () => {
  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Tableau de bord du groupe
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Vue d’ensemble de l’activité et des équipes de ce groupe
        </Typography>
      </Box>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <Box
                    sx={{
                      backgroundColor: `${stat.color}.light`,
                      color: `${stat.color}.dark`,
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                    }}
                  >
                    <stat.icon fontSize="large" />
                  </Box>
                  <Box>
                    <Typography variant="h5">{stat.value}</Typography>
                    <Typography variant="body2" color="textSecondary">{stat.title}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Dernières activités</Typography>
          <Button size="small">Voir tout</Button>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Box>
          <Typography variant="body2" color="textSecondary">
            - Score ajouté par Marie (12 pts) — il y a 2h<br/>
            - Nouvelle équipe créée : "Les Bleus" — hier<br/>
            - Score ajouté par Jean (8 pts) — il y a 3 jours
          </Typography>
        </Box>
      </Paper>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Classement des équipes</Typography>
        <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography color="textSecondary">Graphique à venir</Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default GroupDashboard;
