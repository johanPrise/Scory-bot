import React from 'react';
import { useSnackbar } from 'notistack';
import {
  Box,
  Container,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useCreatorActivities } from './activities/hooks/useCreatorActivities';
import ActivityForm from './activities/components/ActivityForm';
import ActivitiesTable from './activities/components/ActivitiesTable';
import StatsCards from '../../components/StatsCards'; // Assuming a generic StatsCards component

const ConfirmationDialog = ({ open, onClose, onConfirm, title, children, loading }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>{children}</DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={loading}>Annuler</Button>
      <Button onClick={onConfirm} color="error" variant="contained" disabled={loading}>
        {loading ? <CircularProgress size={24} /> : 'Confirmer'}
      </Button>
    </DialogActions>
  </Dialog>
);

const ActivitiesPage = ({ notify }) => {
  const {
    activities,
    stats,
    loading,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    searchTerm,
    setSearchTerm,
    filter,
    setFilter,
    openForm,
    selectedActivity,
    formLoading,
    deleteDialogOpen,
    activityToDelete,
    handleOpenForm,
    handleCloseForm,
    handleSubmit,
    handleDeleteClick,
    handleDeleteConfirm,
    setDeleteDialogOpen,
    fetchActivities,
  } = useCreatorActivities(notify);

  return (
    <Container maxWidth="xl">
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Gestion des activités
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Créez et gérez les activités de votre communauté.
        </Typography>
      </Box>

      <StatsCards stats={stats} />

      <Box display="flex" justifyContent="space-between" alignItems="center" my={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Rechercher une activité..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
            }}
            sx={{ minWidth: 300 }}
          />
          <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filtrer par statut</InputLabel>
            <Select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              label="Filtrer par statut"
            >
              <MenuItem value="all">Toutes</MenuItem>
              <MenuItem value="active">Actives</MenuItem>
              <MenuItem value="inactive">Inactives</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Actualiser">
            <IconButton onClick={fetchActivities}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          Nouvelle activité
        </Button>
      </Box>

      <ActivitiesTable
        activities={activities}
        loading={loading}
        onEdit={handleOpenForm}
        onDelete={handleDeleteClick}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(e, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
      />

      <ActivityForm
        open={openForm}
        onClose={handleCloseForm}
        activity={selectedActivity}
        onSubmit={handleSubmit}
        loading={formLoading}
      />

      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirmer la suppression"
        loading={formLoading}
      >
        <Typography>
          Êtes-vous sûr de vouloir supprimer l'activité <strong>{activityToDelete?.name}</strong>?
        </Typography>
      </ConfirmationDialog>
    </Container>
  );
};

const Activities = () => {
  const { enqueueSnackbar } = useSnackbar();
  const notify = (message, variant = 'info') => {
    enqueueSnackbar(message, { variant });
  };
  return <ActivitiesPage notify={notify} />;
};

export default Activities;
