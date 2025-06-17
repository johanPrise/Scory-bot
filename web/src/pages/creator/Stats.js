import React, { useState, useEffect } from 'react';
import { getStatsData } from '../../api';
import TextField from '@mui/material/TextField';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  useTheme,
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  Group as GroupIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';

// Composant pour les cartes de statistiques
const StatCard = ({ title, value, icon: Icon, color = 'primary', change }) => (
  <Card>
    <CardContent>
      <Box display="flex" alignItems="center" mb={1}>
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
      {change && (
        <Typography 
          variant="caption" 
          sx={{ 
            color: change >= 0 ? 'success.main' : 'error.main',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs période précédente
        </Typography>
      )}
    </CardContent>
  </Card>
);

const Stats = () => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [timeRange, setTimeRange] = useState('30days');
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [endDate, setEndDate] = useState(new Date());
  const [statsData, setStatsData] = useState({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await getStatsData(timeRange);
        setStatsData(data);
      } catch (error) {
        console.error('Error fetching stats data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [timeRange]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
    // Mettre à jour les dates en fonction de la plage sélectionnée
    const now = new Date();
    const newStartDate = new Date(now);
    
    switch (event.target.value) {
      case '7days':
        newStartDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        newStartDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        newStartDate.setDate(now.getDate() - 90);
        break;
      case 'custom':
        // Ne rien faire, l'utilisateur définira les dates manuellement
        return;
      default:
        newStartDate.setDate(now.getDate() - 30);
    }
    
    setStartDate(newStartDate);
  };

  // Format des données pour les graphiques et tableaux
  const chartData = statsData.chartData || [];
  const totalUsers = statsData.totalUsers || 0;
  const totalGroups = statsData.totalGroups || 0;
  const totalActivities = statsData.totalActivities || 0;
  const groupData = statsData.groupData || [];
  const userColumns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Nom', width: 130 },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'activities', headerName: 'Activités', width: 100 },
    { field: 'lastActive', headerName: 'Dernière activité', width: 150 },
  ];

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Statistiques
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Analysez l'utilisation de votre application et l'engagement des utilisateurs.
        </Typography>
      </Box>

      {/* Statistiques rapides */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Activités totales" 
            value={totalActivities} 
            icon={BarChartIcon} 
            color="success"
            change={5.2}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Utilisateurs totaux" 
            value={totalUsers} 
            icon={GroupIcon} 
            color="primary"
            change={12.5}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Groupes actifs" 
            value={totalGroups} 
            icon={GroupIcon} 
            color="secondary"
            change={8.3}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <Button startIcon={<RefreshIcon />} variant="outlined" size="small" onClick={() => handleTimeRangeChange({ target: { value: timeRange } })}>
              Rafraîchir
            </Button>
            <Button startIcon={<DownloadIcon />} variant="outlined" size="small" sx={{ ml: 1 }}>
              Exporter
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* Onglets pour différentes vues statistiques */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="onglets de statistiques">
          <Tab label="Vue d'ensemble" />
          <Tab label="Utilisateurs" />
          <Tab label="Groupes" />
          <Tab label="Activités" />
        </Tabs>
        <Divider />

        {/* Contenu des onglets */}
        {/* Onglet Vue d'ensemble */}
        {tabValue === 0 && (
          <Box p={3}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Plage de temps</InputLabel>
                  <Select value={timeRange} onChange={handleTimeRangeChange} label="Plage de temps">
                    <MenuItem value="7days">7 derniers jours</MenuItem>
                    <MenuItem value="30days">30 derniers jours</MenuItem>
                    <MenuItem value="90days">90 derniers jours</MenuItem>
                    <MenuItem value="custom">Personnalisé</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {timeRange === 'custom' && (
                <>
                  <Grid item xs={12} sm={6} md={3}>
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                      <DatePicker
                        label="Date de début"
                        value={startDate}
                        onChange={(newValue) => setStartDate(newValue)}
                        renderInput={(params) => <TextField {...params} margin="normal" fullWidth />}
                      />
                    </LocalizationProvider>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                      <DatePicker
                        label="Date de fin"
                        value={endDate}
                        onChange={(newValue) => setEndDate(newValue)}
                        renderInput={(params) => <TextField {...params} margin="normal" fullWidth />}
                      />
                    </LocalizationProvider>
                  </Grid>
                </>
              )}

              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Typography variant="body2" color="textSecondary">
                    Graphique d'activité sur la période sélectionnée (à venir)
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Typography variant="body2" color="textSecondary">
                    Répartition des activités par groupe (à venir)
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Onglet Utilisateurs */}
        {tabValue === 1 && (
          <Box p={3}>
            <Typography variant="h6" gutterBottom>Activité des utilisateurs</Typography>
            <Divider sx={{ mb: 2 }} />
            <Box height={400} width="100%">
              <DataGrid
                rows={statsData.userData || []}
                columns={userColumns}
                pageSize={10}
                rowsPerPageOptions={[5, 10, 20]}
                checkboxSelection
                disableSelectionOnClick
              />
            </Box>
          </Box>
        )}

        {/* Onglet Groupes */}
        {tabValue === 2 && (
          <Box p={3}>
            <Typography variant="h6" gutterBottom>Performance des groupes</Typography>
            <Divider sx={{ mb: 2 }} />
            <Box height={400} width="100%">
              <DataGrid
                rows={groupData}
                columns={
                  [
                    { field: 'id', headerName: 'ID', width: 70 },
                    { field: 'name', headerName: 'Nom du groupe', width: 130 },
                    { field: 'members', headerName: 'Membres', width: 100 },
                    { field: 'activities', headerName: 'Activités', width: 100 },
                    { field: 'lastActive', headerName: 'Dernière activité', width: 150 },
                  ]
                }
                pageSize={10}
                rowsPerPageOptions={[5, 10, 20]}
                checkboxSelection
                disableSelectionOnClick
              />
            </Box>
          </Box>
        )}

        {/* Onglet Activités */}
        {tabValue === 3 && (
          <Box p={3}>
            <Typography variant="h6" gutterBottom>Détails des activités</Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Typography variant="body2" color="textSecondary">
                    Types d'activités sur la période (à venir)
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Typography variant="body2" color="textSecondary">
                    Activités par utilisateur (à venir)
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default Stats;
