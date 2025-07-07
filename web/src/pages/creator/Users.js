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
import { useCreatorUsers } from './users/hooks/useCreatorUsers';
import UserForm from './users/components/UserForm';
import UsersTable from './users/components/UsersTable';
import { useAuth } from '../../context/AuthContext';

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

const UsersPage = ({ notify }) => {
  const { currentUser } = useAuth();
  const {
    users,
    loading,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    searchTerm,
    setSearchTerm,
    openForm,
    selectedUser,
    formLoading,
    deleteDialogOpen,
    userToDelete,
    handleOpenForm,
    handleCloseForm,
    handleSubmit,
    handleDeleteClick,
    handleDeleteConfirm,
    setDeleteDialogOpen,
  } = useCreatorUsers(notify);

  return (
    <Container maxWidth="xl">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          Gestion des Utilisateurs
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenForm()}
        >
          Ajouter un utilisateur
        </Button>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <TextField
          variant="outlined"
          placeholder="Rechercher par nom, email ou rôle..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          fullWidth
          size="small"
          InputProps={{
            startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
          }}
        />
      </Paper>

      <UsersTable
        users={users}
        loading={loading}
        onEdit={handleOpenForm}
        onDelete={handleDeleteClick}
        currentUserId={currentUser?._id}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(e, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
      />

      <UserForm
        open={openForm}
        onClose={handleCloseForm}
        user={selectedUser}
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
          Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{userToDelete?.username}</strong>?
        </Typography>
      </ConfirmationDialog>
    </Container>
  );
};

const Users = () => {
  const { enqueueSnackbar } = useSnackbar();
  const notify = (message, variant = 'info') => {
    enqueueSnackbar(message, { variant });
  };
  return <UsersPage notify={notify} />;
};

export default Users;
