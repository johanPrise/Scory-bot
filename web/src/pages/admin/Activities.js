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
  Button,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Switch,
  FormControlLabel,
  Grid
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { fetchActivities, updateActivity, deleteActivity, createActivity } from '../../api';
import { useAuth } from '../../context/AuthContext';

const Activities = () => {
  const { hasPermission } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [categories, setCategories] = useState([]);

  // Formulaire d'édition/création
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    points: 10,
    isActive: true,
    maxScorePerUser: 0,
    cooldownHours: 0,
    requiresApproval: false,
    requiresEvidence: false
  });

  useEffect(() => {
    loadActivities();
    // Dans un cas réel, nous chargerions également les catégories depuis l'API
    setCategories(['Sport', 'Culture', 'Éducation', 'Bénévolat', 'Autre']);
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchActivities();
      setActivities(response.activities || []);
    } catch (err) {
      console.error('Erreur lors du chargement des activités:', err);
      setError(err.message || 'Erreur lors du chargement des activités');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, checked } = e.target;
    const newValue = e.target.type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  const handleNumberInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: Number(value) }));
  };

  const handleEditActivity = (activity) => {
    setCurrentActivity(activity);
    setFormData({
      name: activity.name || '',
      description: activity.description || '',
      category: activity.category || '',
      points: activity.points || 10,
      isActive: activity.isActive !== false,
      maxScorePerUser: activity.maxScorePerUser || 0,
      cooldownHours: activity.cooldownHours || 0,
      requiresApproval: activity.requiresApproval || false,
      requiresEvidence: activity.requiresEvidence || false
    });
    setOpenEditDialog(true);
  };

  const handleDeleteActivity = (activity) => {
    setCurrentActivity(activity);
    setOpenDeleteDialog(true);
  };

  const handleCreateNewActivity = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      points: 10,
      isActive: true,
      maxScorePerUser: 0,
      cooldownHours: 0,
      requiresApproval: false,
      requiresEvidence: false
    });
    setOpenCreateDialog(true);
  };

  const submitEditActivity = async () => {
    try {
      await updateActivity(currentActivity._id, formData);
      setOpenEditDialog(false);
      setNotification({
        open: true,
        message: 'Activité mise à jour avec succès',
        severity: 'success'
      });
      loadActivities();
    } catch (err) {
      setNotification({
        open: true,
        message: err.message || 'Erreur lors de la mise à jour de l\'activité',
        severity: 'error'
      });
    }
  };

  const submitDeleteActivity = async () => {
    try {
      await deleteActivity(currentActivity._id);
      setOpenDeleteDialog(false);
      setNotification({
        open: true,
        message: 'Activité supprimée avec succès',
        severity: 'success'
      });
      loadActivities();
    } catch (err) {
      setNotification({
        open: true,
        message: err.message || 'Erreur lors de la suppression de l\'activité',
        severity: 'error'
      });
    }
  };

  const submitCreateActivity = async () => {
    try {
      await createActivity(formData);
      setOpenCreateDialog(false);
      setNotification({
        open: true,
        message: 'Activité créée avec succès',
        severity: 'success'
      });
      loadActivities();
    } catch (err) {
      setNotification({
        open: true,
        message: err.message || 'Erreur lors de la création de l\'activité',
        severity: 'error'
      });
    }
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

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

  if (!hasPermission('manage_activities')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Gestion des activités
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleCreateNewActivity}
        >
          Nouvelle activité
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Catégorie</TableCell>
                  <TableCell>Points</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Approbation</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activities.length > 0 ? (
                  activities.map((activity) => (
                    <TableRow key={activity._id} hover>
                      <TableCell>{activity.name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={activity.category || 'Non catégorisé'} 
                          color={getCategoryColor(activity.category)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{activity.points}</TableCell>
                      <TableCell>
                        {activity.isActive !== false ? (
                          <Chip 
                            icon={<VisibilityIcon fontSize="small" />}
                            label="Active" 
                            color="success"
                            size="small"
                          />
                        ) : (
                          <Chip 
                            icon={<VisibilityOffIcon fontSize="small" />}
                            label="Inactive" 
                            color="default"
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {activity.requiresApproval ? (
                          <Chip 
                            label="Requise" 
                            color="warning"
                            size="small"
                          />
                        ) : (
                          <Chip 
                            label="Auto" 
                            color="info"
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton 
                          color="primary" 
                          onClick={() => handleEditActivity(activity)}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          color="error" 
                          onClick={() => handleDeleteActivity(activity)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Aucune activité trouvée
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Dialog d'édition */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Modifier l'activité</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <TextField
                  label="Nom de l'activité"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Catégorie</InputLabel>
                  <Select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    label="Catégorie"
                  >
                    <MenuItem value="">Non catégorisé</MenuItem>
                    {categories.map(category => (
                      <MenuItem key={category} value={category}>{category}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  fullWidth
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Points"
                  name="points"
                  type="number"
                  value={formData.points}
                  onChange={handleNumberInputChange}
                  fullWidth
                  required
                  InputProps={{ inputProps: { min: 1 } }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Max scores par utilisateur"
                  name="maxScorePerUser"
                  type="number"
                  value={formData.maxScorePerUser}
                  onChange={handleNumberInputChange}
                  fullWidth
                  helperText="0 = illimité"
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Délai entre scores (heures)"
                  name="cooldownHours"
                  type="number"
                  value={formData.cooldownHours}
                  onChange={handleNumberInputChange}
                  fullWidth
                  helperText="0 = pas de délai"
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      name="isActive"
                      color="primary"
                    />
                  }
                  label="Activité active"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.requiresApproval}
                      onChange={handleInputChange}
                      name="requiresApproval"
                      color="primary"
                    />
                  }
                  label="Nécessite approbation"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.requiresEvidence}
                      onChange={handleInputChange}
                      name="requiresEvidence"
                      color="primary"
                    />
                  }
                  label="Nécessite preuve"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Annuler</Button>
          <Button onClick={submitEditActivity} variant="contained" color="primary">
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de suppression */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer l'activité "{currentActivity?.name}" ? 
            Cette action est irréversible et supprimera également tous les scores associés à cette activité.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Annuler</Button>
          <Button onClick={submitDeleteActivity} variant="contained" color="error">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de création */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nouvelle activité</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <TextField
                  label="Nom de l'activité"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Catégorie</InputLabel>
                  <Select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    label="Catégorie"
                  >
                    <MenuItem value="">Non catégorisé</MenuItem>
                    {categories.map(category => (
                      <MenuItem key={category} value={category}>{category}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  fullWidth
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Points"
                  name="points"
                  type="number"
                  value={formData.points}
                  onChange={handleNumberInputChange}
                  fullWidth
                  required
                  InputProps={{ inputProps: { min: 1 } }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Max scores par utilisateur"
                  name="maxScorePerUser"
                  type="number"
                  value={formData.maxScorePerUser}
                  onChange={handleNumberInputChange}
                  fullWidth
                  helperText="0 = illimité"
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Délai entre scores (heures)"
                  name="cooldownHours"
                  type="number"
                  value={formData.cooldownHours}
                  onChange={handleNumberInputChange}
                  fullWidth
                  helperText="0 = pas de délai"
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      name="isActive"
                      color="primary"
                    />
                  }
                  label="Activité active"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.requiresApproval}
                      onChange={handleInputChange}
                      name="requiresApproval"
                      color="primary"
                    />
                  }
                  label="Nécessite approbation"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.requiresEvidence}
                      onChange={handleInputChange}
                      name="requiresEvidence"
                      color="primary"
                    />
                  }
                  label="Nécessite preuve"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Annuler</Button>
          <Button onClick={submitCreateActivity} variant="contained" color="primary">
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Activities;