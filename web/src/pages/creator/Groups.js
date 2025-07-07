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
  Paper,
  TextField,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { useCreatorGroups } from './groups/hooks/useCreatorGroups';
import GroupForm from './groups/components/GroupForm';
import GroupsTable from './groups/components/GroupsTable';
import MembersListDialog from './groups/components/MembersListDialog';

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

const GroupsPage = ({ notify }) => {
  const {
    groups,
    loading,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    searchTerm,
    setSearchTerm,
    openForm,
    selectedGroup,
    formLoading,
    deleteDialogOpen,
    groupToDelete,
    membersDialogOpen,
    currentGroupMembers,
    handleOpenForm,
    handleCloseForm,
    handleSubmit,
    handleDeleteClick,
    handleDeleteConfirm,
    setDeleteDialogOpen,
    handleOpenMembersDialog,
    handleCloseMembersDialog,
    handleAddMember,
    handleRemoveMember,
  } = useCreatorGroups(notify);

  return (
    <Container maxWidth="xl">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          Gestion des Groupes
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          Créer un groupe
        </Button>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <TextField
          variant="outlined"
          placeholder="Rechercher un groupe..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          fullWidth
          size="small"
          InputProps={{
            startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
          }}
        />
      </Paper>

      <GroupsTable
        groups={groups}
        loading={loading}
        onEdit={handleOpenForm}
        onDelete={handleDeleteClick}
        onManageMembers={handleOpenMembersDialog}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(e, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
      />

      <GroupForm
        open={openForm}
        onClose={handleCloseForm}
        group={selectedGroup}
        onSubmit={handleSubmit}
        loading={formLoading}
      />

      <MembersListDialog
        open={membersDialogOpen}
        onClose={handleCloseMembersDialog}
        members={currentGroupMembers}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
      />

      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Confirmer la suppression"
        loading={formLoading}
      >
        <Typography>
          Êtes-vous sûr de vouloir supprimer le groupe <strong>{groupToDelete?.name}</strong>?
        </Typography>
      </ConfirmationDialog>
    </Container>
  );
};

const Groups = () => {
  const { enqueueSnackbar } = useSnackbar();
  const notify = (message, variant = 'info') => {
    enqueueSnackbar(message, { variant });
  };
  return <GroupsPage notify={notify} />;
};

export default Groups;
