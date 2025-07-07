import React, { useState, useCallback } from 'react';
import { Box, Container, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import ScoreForm from './components/ScoreForm';
import ScoreTable from './components/ScoreTable';
import ScoreFilters from './components/ScoreFilters';
import ScoreActions from './components/ScoreActions';
import ScoreStats from './components/ScoreStats';
import Page from '../../../components/Page';
import useScores from './hooks/useScores';

const ScoresPage = () => {
  const {
    // États
    scores,
    users,
    activities,
    loading,
    page,
    rowsPerPage,
    orderBy,
    order,
    filters,
    searchQuery,
    formOpen,
    deleteDialogOpen,
    bulkDeleteDialogOpen,
    selectedScore,
    selectedScores,
    deleteLoading,
    bulkDeleteLoading,
    exportLoading,
    stats,
    totalCount,
    
    // Handlers
    setPage,
    setRowsPerPage,
    setSearchQuery,
    setFormOpen,
    setDeleteDialogOpen,
    setBulkDeleteDialogOpen,
    setSelectedScore,
    setSelectedScores,
    handleCreateScore,
    handleUpdateScore,
    handleDeleteScore,
    handleBulkDelete,
    handleRequestSort,
    handleFilterChange,
    handleSelectAllClick,
    handleSelectClick,
    fetchData
  } = useScores();

  const { enqueueSnackbar } = useSnackbar();
  const [showFilters, setShowFilters] = useState(false);

  // Gestion des notifications
  const notify = useCallback((message, variant = 'info') => {
    enqueueSnackbar(message, { variant });
  }, [enqueueSnackbar]);

  // Gestion du formulaire
  const handleOpenForm = (score = null) => {
    setSelectedScore(score);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setSelectedScore(null);
  };

  const handleSubmitForm = async (formData) => {
    try {
      if (selectedScore) {
        await handleUpdateScore(selectedScore._id, formData);
      } else {
        await handleCreateScore(formData);
      }
      handleCloseForm();
      return true;
    } catch (error) {
      notify(error.message || "Une erreur s'est produite", 'error');
      return false;
    }
  };

  // Gestion de la suppression
  const handleDeleteClick = (score) => {
    setSelectedScore(score);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedScore) return;
    await handleDeleteScore(selectedScore._id);
    setDeleteDialogOpen(false);
    setSelectedScore(null);
  };

  // Gestion de la suppression multiple
  const handleBulkDeleteClick = () => {
    if (selectedScores.length === 0) return;
    setBulkDeleteDialogOpen(true);
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedScores.length === 0) return;
    await handleBulkDelete();
    setBulkDeleteDialogOpen(false);
  };

  // Gestion de l'export CSV
  const handleExportCSV = () => {
    notify('Exportation des données en cours...', 'info');
  };

  // Réinitialiser les filtres
  const handleResetFilters = () => {
    handleFilterChange('status', 'all');
    handleFilterChange('userId', '');
    handleFilterChange('activityId', '');
    handleFilterChange('dateRange', { start: null, end: null });
    setSearchQuery('');
  };

  // Basculer l'affichage des filtres
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  return (
    <Page title="Scores | Scory Bot">
      <Container maxWidth={false}>
        <ScoreStats stats={stats} loading={loading} />
        
        <ScoreFilters
          filters={filters}
          users={users}
          activities={activities}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          showFilters={showFilters}
          onToggleFilters={toggleFilters}
        />
        
        <ScoreActions
          selectedScores={scores.filter(score => selectedScores.includes(score._id))}
          scores={scores}
          onBulkDelete={handleBulkDeleteClick}
          loading={bulkDeleteLoading}
          exportLoading={exportLoading}
          onExportCSV={handleExportCSV}
        />
        
        <Box sx={{ mt: 2 }}>
          <ScoreTable
            scores={scores}
            page={page}
            rowsPerPage={rowsPerPage}
            orderBy={orderBy}
            order={order}
            selectedScores={selectedScores}
            onSort={handleRequestSort}
            onSelectAllClick={handleSelectAllClick}
            onSelectClick={handleSelectClick}
            onEdit={handleOpenForm}
            onDelete={handleDeleteClick}
            onPageChange={(e, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            totalCount={totalCount}
          />
        </Box>
        
        {/* Formulaire d'ajout/édition */}
        <ScoreForm
          open={formOpen}
          onClose={handleCloseForm}
          score={selectedScore}
          users={users}
          activities={activities}
          onSubmit={handleSubmitForm}
          loading={loading}
        />
        
        {/* Dialogue de confirmation de suppression */}
        <ConfirmationDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={handleDeleteConfirm}
          title="Supprimer le score"
          content="Êtes-vous sûr de vouloir supprimer ce score ? Cette action est irréversible."
          confirmText="Supprimer"
          confirmColor="error"
          loading={deleteLoading}
        />
        
        {/* Dialogue de confirmation de suppression multiple */}
        <ConfirmationDialog
          open={bulkDeleteDialogOpen}
          onClose={() => setBulkDeleteDialogOpen(false)}
          onConfirm={handleBulkDeleteConfirm}
          title={`Supprimer ${selectedScores.length} scores`}
          content={`Êtes-vous sûr de vouloir supprimer les ${selectedScores.length} scores sélectionnés ? Cette action est irréversible.`}
          confirmText="Supprimer"
          confirmColor="error"
          loading={bulkDeleteLoading}
        />
      </Container>
    </Page>
  );
};

// Composant de dialogue de confirmation réutilisable
const ConfirmationDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  content,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  confirmColor = 'primary',
  loading = false
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography>{content}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={loading}>
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          color={confirmColor}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScoresPage;
