import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Tabs,
  Tab,
  Avatar,
  Tooltip,
  Divider
} from '@mui/material';
import { 
  FilterList as FilterListIcon,
  Search as SearchIcon,
  EmojiEvents as EmojiEventsIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  SportsSoccer as SportsSoccerIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { scores } from '../api';
import { useAuth } from '../context/AuthContext';
import { useTelegram } from '../context/TelegramContext';

// Composant pour afficher un score individuel
const ScoreItem = ({ score, showUser = true, showActivity = true }) => {
  return (
    <TableRow hover>
      {showUser && (
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
              {score.user?.username?.charAt(0) || score.user?.firstName?.charAt(0) || 'U'}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight="medium">
                {score.user?.username || score.user?.firstName || 'Utilisateur inconnu'}
              </Typography>
              {score.user?.telegramId && (
                <Typography variant="caption" color="textSecondary">
                  @{score.user.telegramUsername || score.user.telegramId}
                </Typography>
              )}
            </Box>
          </Box>
        </TableCell>
      )}
      {showActivity && (
        <TableCell>
          <Chip 
            label={score.activity?.name || 'Activité inconnue'} 
            size="small"
            color={getCategoryColor(score.activity?.category)}
            icon={<SportsSoccerIcon fontSize="small" />}
          />
        </TableCell>
      )}
      <TableCell>
        <Typography variant="body2" fontWeight="medium">
          {score.points}
        </Typography>
      </TableCell>
      <TableCell>
        {score.team ? (
          <Chip 
            label={score.team.name} 
            size="small"
            color="secondary"
            icon={<GroupIcon fontSize="small" />}
          />
        ) : (
          <Chip 
            label="Personnel" 
            size="small"
            color="primary"
            icon={<PersonIcon fontSize="small" />}
          />
        )}
      </TableCell>
      <TableCell>
        {new Date(score.createdAt).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </TableCell>
      <TableCell>
        {score.approved ? (
          <Chip 
            label="Approuvé" 
            size="small"
            color="success"
          />
        ) : score.rejected ? (
          <Chip 
            label="Rejeté" 
            size="small"
            color="error"
          />
        ) : (
          <Chip 
            label="En attente" 
            size="small"
            color="warning"
          />
        )}
      </TableCell>
    </TableRow>
  );
};

// Fonction utilitaire pour obtenir la couleur de la catégorie
const getCategoryColor = (category) => {
  switch (category) {
    case 'Sport':
      return 'success';
    case 'Culture':
      return 'primary';
    case 'Éducation':
      return 'info';
    case 'Bénévolat':
      return 'warning';
    default:
      return 'default';
  }
};

// Composant principal
const Scores = () => {
  const { currentUser, hasPermission } = useAuth();
  const { telegram, user } = useTelegram();
  const isTelegram = !!telegram;
  
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [filters, setFilters] = useState({
    period: 'month',
    type: 'all',
    activity: '',
    team: '',
    search: ''
  });
  const [stats, setStats] = useState({
    totalScores: 0,
    totalPoints: 0,
    personalPoints: 0,
    teamPoints: 0,
    pendingScores: 0
  });

  useEffect(() => {
    loadScores();
  }, [tabValue, filters.period]);

  const loadScores = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Déterminer le type de scores à charger en fonction de l'onglet
      let response;
      const filterParams = {
        period: filters.period,
        activity: filters.activity,
        team: filters.team,
        search: filters.search
      };
      
      if (tabValue === 1) {
        response = await scores.getPersonal(filterParams);
      } else if (tabValue === 2) {
        response = await scores.getTeam(filterParams);
      } else if (tabValue === 3 && hasPermission('approve_scores')) {
        response = await scores.getPending(filterParams);
      } else {
        response = await scores.getAll(filterParams);
      }
      
      setScores(response.scores || []);
      setStats({
        totalScores: response.totalScores || 0,
        totalPoints: response.totalPoints || 0,
        personalPoints: response.personalPoints || 0,
        teamPoints: response.teamPoints || 0,
        pendingScores: response.pendingScores || 0
      });
    } catch (err) {
      console.error('Erreur lors du chargement des scores:', err);
      setError(err.message || 'Erreur lors du chargement des scores');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = () => {
    loadScores();
  };

  // Statistiques à afficher
  const statsCards = [
    {
      title: 'Total des scores',
      value: stats.totalScores,
      icon: TimelineIcon,
      color: 'primary'
    },
    {
      title: 'Points personnels',
      value: stats.personalPoints,
      icon: PersonIcon,
      color: 'info'
    },
    {
      title: 'Points d\'équipe',
      value: stats.teamPoints,
      icon: GroupIcon,
      color: 'secondary'
    },
    {
      title: 'Scores en attente',
      value: stats.pendingScores,
      icon: EmojiEventsIcon,
      color: 'warning'
    }
  ];

  return (
    <Box sx={{ flexGrow: 1, p: 3 }} className={isTelegram ? 'telegram-theme' : ''}>
      <Typography variant="h4" component="h1" gutterBottom>
        Scores
      </Typography>

      {/* Cartes de statistiques */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card elevation={3}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
                <Box
                  sx={{
                    backgroundColor: `${stat.color}.light`,
                    color: `${stat.color}.main`,
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1,
                  }}
                >
                  <stat.icon />
                </Box>
                <Typography variant="body2" color="textSecondary" align="center">
                  {stat.title}
                </Typography>
                {loading ? (
                  <CircularProgress size={24} sx={{ my: 1 }} />
                ) : (
                  <Typography variant="h5" color={`${stat.color}.main`} align="center">
                    {stat.value}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Onglets pour filtrer les types de scores */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Tous les scores" />
          <Tab label="Scores personnels" />
          <Tab label="Scores d'équipe" />
          {hasPermission('approve_scores') && <Tab label="En attente d'approbation" />}
        </Tabs>
      </Paper>

      {/* Filtres */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Période</InputLabel>
              <Select
                name="period"
                value={filters.period}
                onChange={handleFilterChange}
                label="Période"
              >
                <MenuItem value="day">Aujourd'hui</MenuItem>
                <MenuItem value="week">Cette semaine</MenuItem>
                <MenuItem value="month">Ce mois</MenuItem>
                <MenuItem value="year">Cette année</MenuItem>
                <MenuItem value="all">Tout</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                name="type"
                value={filters.type}
                onChange={handleFilterChange}
                label="Type"
                disabled={tabValue !== 0}
              >
                <MenuItem value="all">Tous</MenuItem>
                <MenuItem value="personal">Personnel</MenuItem>
                <MenuItem value="team">Équipe</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              name="search"
              label="Rechercher"
              value={filters.search}
              onChange={handleFilterChange}
              InputProps={{
                endAdornment: (
                  <IconButton size="small" onClick={handleSearch}>
                    <SearchIcon />
                  </IconButton>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Tooltip title="Filtres avancés">
                <IconButton color="primary">
                  <FilterListIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tableau des scores */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 'calc(100vh - 400px)' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {(tabValue !== 1) && <TableCell>Utilisateur</TableCell>}
                  <TableCell>Activité</TableCell>
                  <TableCell>Points</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Statut</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {scores.length > 0 ? (
                  scores.map((score) => (
                    <ScoreItem 
                      key={score._id} 
                      score={score} 
                      showUser={tabValue !== 1}
                      showActivity={true}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={tabValue === 1 ? 5 : 6} align="center">
                      <Box sx={{ py: 3 }}>
                        <Typography color="textSecondary">
                          Aucun score trouvé
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default Scores;