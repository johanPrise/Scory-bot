import React from 'react';
import { useSnackbar } from 'notistack';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useCreatorScores } from './scores/hooks/useCreatorScores';
import ScoresTable from '../../components/ScoresTable';
import ScoresFilters from '../../components/ScoresFilters';
import AddScoreDialog from '../../components/AddScoreDialog';
import BulkActionsToolbar from '../../components/BulkActionsToolbar';

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

const ScoresPage = ({ notify }) => {
  const {
    scores,
    users,
    activities,
    loading,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    showFilters,
    setShowFilters,
    selected,
    openForm,
    selectedScore,
    deleteDialogOpen,
    scoreToDelete,
    bulkDeleteDialogOpen,
    formLoading,
    deleteLoading,
    bulkDeleteLoading,
    filteredAndSortedScores,
    handleOpenForm,
    handleCloseForm,
    handleSubmit,
    handleDeleteClick,
    handleDeleteConfirm,
    handleBulkDeleteClick,
    handleBulkDeleteConfirm,
    handleSelectAllClick,
    handleClick,
    isSelected,
    setScoreToDelete,
    setDeleteDialogOpen,
    setBulkDeleteDialogOpen,
  } = useCreatorScores(notify);

  return (
    <Container maxWidth="xl">
      <Box mb={4}>
        {selected.length > 0 ? (
          <BulkActionsToolbar
            numSelected={selected.length}
            onDelete={handleBulkDeleteClick}
          />
        ) : (
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h4" component="h1">
              Gestion des scores
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpenForm()}
            >
              Ajouter un score
            </Button>
          </Box>
        )}
      </Box>

      <ScoresFilters
        filters={filters}
        onFilterChange={(newFilters) => setFilters(newFilters)}
        searchQuery={searchQuery}
        onSearchChange={(e) => setSearchQuery(e.target.value)}
        showAdvanced={showFilters}
        onToggleAdvanced={() => setShowFilters(!showFilters)}
        users={users}
        activities={activities}
      />

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <ScoresTable
          scores={filteredAndSortedScores}
          loading={loading}
          selected={selected}
          onSelectAllClick={handleSelectAllClick}
          onRowClick={handleClick}
          isSelected={isSelected}
          onEdit={handleOpenForm}
          onDelete={handleDeleteClick}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
        />
      </Paper>

      <AddScoreDialog
        open={openForm}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        score={selectedScore}
        users={users}
        activities={activities}
        loading={formLoading}
      />

      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirmer la suppression"
        loading={deleteLoading}
      >
        <Typography>
          Êtes-vous sûr de vouloir supprimer le score de <strong>{scoreToDelete?.user?.name}</strong> pour l'activité <strong>{scoreToDelete?.activity?.name}</strong> ?
        </Typography>
      </ConfirmationDialog>

      <ConfirmationDialog
        open={bulkDeleteDialogOpen}
        onClose={() => setBulkDeleteDialogOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
        title="Confirmer la suppression en masse"
        loading={bulkDeleteLoading}
      >
        <Typography>
          Êtes-vous sûr de vouloir supprimer les <strong>{selected.length}</strong> scores sélectionnés ?
        </Typography>
      </ConfirmationDialog>
    </Container>
  );
};

const Scores = () => {
  const { enqueueSnackbar } = useSnackbar();
  const notify = (message, variant = 'info') => {
    enqueueSnackbar(message, { variant });
  };

  return <ScoresPage notify={notify} />;
};

export default Scores;
