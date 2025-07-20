import React, { useEffect, useState, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Alert,
  Tabs,
  Tab,
  Button,
} from '@mui/material';
import { 
  FileDownload as FileDownloadIcon,
  Add as AddIcon,
  EmojiEvents as EmojiEventsIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useTelegram } from '../context/TelegramContext';
import { useNotification } from '../context/NotificationContext';
import AddScoreDialog from '../components/AddScoreDialog';
import ExportScoresDialog from '../components/ExportScoresDialog';
import ScoresFilters from '../components/ScoresFilters';
import StatsCards from '../components/StatsCards';
import ScoresTable from '../components/ScoresTable';
import FeedbackForm from '../components/FeedbackForm';
import BulkActionsToolbar from '../components/BulkActionsToolbar';
import DetailedScoreHistory from '../components/DetailedScoreHistory';

const Scores = () => {
  const { hasPermission } = useAuth();
  const { telegram } = useTelegram();
  const { notify } = useNotification();
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
  const [addOpen, setAddOpen] = useState(false);
  const [newScore, setNewScore] = useState({ activity: '', points: '', team: '', type: 'personal' });
  const [activitiesList, setActivitiesList] = useState([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    format: 'csv',
    includeSubScores: true,
    dateRange: 'current',
    fields: ['user', 'activity', 'points', 'team', 'date', 'status']
  });
  const [exporting, setExporting] = useState(false);
  const [selectedScores, setSelectedScores] = useState([]);

  const loadScores = useCallback(async () => {
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
      notify('Scores chargés avec succès', 'success');
    } catch (err) {
      console.error('Erreur lors du chargement des scores:', err);
      setError(err.message || 'Erreur lors du chargement des scores');
      notify('Erreur lors du chargement des scores', 'error');
    } finally {
      setLoading(false);
    }
  }, [tabValue, filters.period, filters.activity, filters.team, filters.search, hasPermission, notify, scores]);

  useEffect(() => {
    loadScores();
  }, [tabValue, filters.period, loadScores]);

  useEffect(() => {
    // Charger la liste des activités pour le formulaire
    const fetchActivities = async () => {
      try {
        const data = await import('../api').then(m => m.activities.getAll());
        setActivitiesList(data);
      } catch (e) {
        // ignore
      }
    };
    fetchActivities();
  }, []);

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

  const handleAddScore = async () => {
    try {
      await scores.create({
        activity: newScore.activity,
        points: Number(newScore.points),
        team: newScore.team || undefined,
        type: newScore.type,
      });
      setAddOpen(false);
      setNewScore({ activity: '', points: '', team: '', type: 'personal' });
      notify('Score ajouté', 'success');
      loadScores();
    } catch (e) {
      notify('Erreur lors de l\'ajout du score', 'error');
    }
  };

  // Gestion approbation/rejet
  const handleApprove = async (scoreId) => {
    try {
      await scores.approve(scoreId);
      notify('Score approuvé', 'success');
      loadScores();
    } catch (e) {
      notify('Erreur lors l\'approbation', 'error');
    }
  };
  const handleReject = async (scoreId) => {
    try {
      await scores.reject(scoreId, 'Rejeté via interface');
      notify('Score rejeté', 'info');
      loadScores();
    } catch (e) {
      notify('Erreur lors du rejet', 'error');
    }
  };

  // Ajout sous-score
  const handleAddSubScore = async (scoreId, points, description) => {
    try {
      await scores.create({ parentScore: scoreId, points, description });
      notify('Sous-score ajouté', 'success');
      loadScores();
    } catch (e) {
      notify('Erreur lors de l\'ajout du sous-score', 'error');
    }
  };

  // Export des données
  const handleExport = async () => {
    try {
      setExporting(true);
      
      // Préparer les filtres pour l'export
      const exportFilters = {
        ...filters,
        tabType: tabValue === 1 ? 'personal' : tabValue === 2 ? 'team' : tabValue === 3 ? 'pending' : 'all',
        includeSubScores: exportOptions.includeSubScores,
        dateRange: exportOptions.dateRange,
        fields: exportOptions.fields.join(',')
      };

      // Appeler l'API d'export
      const blob = await scores.export(exportFilters, exportOptions.format);
      
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Générer le nom du fichier
      const timestamp = new Date().toISOString().split('T')[0];
      const tabName = tabValue === 1 ? 'personnels' : tabValue === 2 ? 'equipe' : tabValue === 3 ? 'en-attente' : 'tous';
      link.download = `scores-${tabName}-${timestamp}.${exportOptions.format}`;
      
      // Déclencher le téléchargement
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setExportOpen(false);
      notify('Export réussi', 'success');
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      notify('Erreur lors de l\'export', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleFieldToggle = (field) => {
    setExportOptions(prev => ({
      ...prev,
      fields: prev.fields.includes(field) 
        ? prev.fields.filter(f => f !== field)
        : [...prev.fields, field]
    }));
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

  const handleSelectScore = (id) => {
    setSelectedScores((prev) => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
  };
  const handleSelectAll = (checked) => {
    setSelectedScores(checked ? scores.map(s => s._id) : []);
  };
  const handleBulkApprove = async () => {
    try {
      // Process each score individually since bulk operations are no longer available
      for (const scoreId of selectedScores) {
        await scores.approve(scoreId);
      }
      notify('Scores approuvés', 'success');
      setSelectedScores([]);
      loadScores();
    } catch (e) {
      notify('Erreur lors de l\'approbation en lot', 'error');
    }
  };
  const handleBulkReject = async () => {
    try {
      // Process each score individually since bulk operations are no longer available
      for (const scoreId of selectedScores) {
        await scores.reject(scoreId, 'Rejeté par admin');
      }
      notify('Scores rejetés', 'success');
      setSelectedScores([]);
      loadScores();
    } catch (e) {
      notify('Erreur lors du rejet en lot', 'error');
    }
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }} className={isTelegram ? 'telegram-theme' : ''}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Scores
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<FileDownloadIcon />}
            onClick={() => setExportOpen(true)}
            disabled={loading || scores.length === 0}
          >
            Exporter
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={() => setAddOpen(true)}
          >
            Ajouter un score
          </Button>
        </Box>
      </Box>

      <AddScoreDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAddScore}
        newScore={newScore}
        setNewScore={setNewScore}
        activitiesList={activitiesList}
        loading={loading}
      />

      <StatsCards statsCards={statsCards} loading={loading} />

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
          {hasPermission('admin') && <Tab label="Historique détaillé" />}
        </Tabs>
      </Paper>

      {/* Filtres */}
      <ScoresFilters
        filters={filters}
        tabValue={tabValue}
        handleFilterChange={handleFilterChange}
        handleSearch={handleSearch}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tableau des scores extrait dans ScoresTable */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <ScoresTable
          loading={loading}
          scores={scores}
          tabValue={tabValue}
          hasPermission={hasPermission}
          handleApprove={handleApprove}
          handleReject={handleReject}
          handleAddSubScore={handleAddSubScore}
          selectedScores={selectedScores}
          handleSelectScore={handleSelectScore}
          handleSelectAll={handleSelectAll}
        />
      </Paper>

      {tabValue === 3 && hasPermission('approve_scores') && (
        <BulkActionsToolbar
          allSelected={selectedScores.length === scores.length && scores.length > 0}
          someSelected={selectedScores.length > 0 && selectedScores.length < scores.length}
          onSelectAll={handleSelectAll}
          onBulkApprove={handleBulkApprove}
          onBulkReject={handleBulkReject}
          disabled={selectedScores.length === 0}
        />
      )}

      <ExportScoresDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
        exportOptions={exportOptions}
        setExportOptions={setExportOptions}
        exporting={exporting}
        scoresLength={scores.length}
        handleFieldToggle={handleFieldToggle}
      />

      {tabValue === 4 && hasPermission('admin') && (
        <DetailedScoreHistory />
      )}

      <Box sx={{ my: 4 }}>
        <FeedbackForm />
      </Box>
    </Box>
  );
};

export default Scores;