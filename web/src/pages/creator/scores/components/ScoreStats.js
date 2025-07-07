import React from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Grid, 
  Divider, 
  useTheme,
  useMediaQuery,
  CircularProgress
} from '@mui/material';
import ScoreIcon from '@mui/icons-material/Score';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import TimelineIcon from '@mui/icons-material/Timeline';

const StatCard = ({ title, value, icon: Icon, color }) => {
  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 2, 
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          boxShadow: 2,
          transform: 'translateY(-2px)',
          transition: 'all 0.2s ease-in-out',
        }
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="subtitle2" color="text.secondary" noWrap>
          {title}
        </Typography>
        <Box
          sx={{
            p: 1,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: `${color}.light`,
            color: `${color}.dark`,
          }}
        >
          <Icon fontSize="small" />
        </Box>
      </Box>
      <Typography variant="h5" fontWeight="bold" color={color + '.dark'}>
        {value}
      </Typography>
    </Paper>
  );
};

const ScoreStats = ({ stats, loading = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  const statItems = [
    {
      title: 'Total des scores',
      value: stats.totalScores,
      icon: ScoreIcon,
      color: 'primary'
    },
    {
      title: 'Points totaux',
      value: stats.totalPoints,
      icon: TimelineIcon,
      color: 'secondary'
    },
    {
      title: 'Moyenne des points',
      value: stats.avgPoints,
      icon: ScoreIcon,
      color: 'info'
    },
    {
      title: 'En attente',
      value: stats.pendingCount,
      icon: PendingIcon,
      color: 'warning'
    },
    {
      title: 'Approuvés',
      value: stats.approvedCount,
      icon: CheckCircleIcon,
      color: 'success'
    }
  ];

  return (
    <Box mb={3}>
      <Grid container spacing={2}>
        {statItems.map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2.4} key={index}>
            <StatCard 
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ScoreStats;
