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
  List,
  ListItem,
  ListItemText,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon, Delete as DeleteIcon } from '@mui/icons-material';
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
    teams,
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
    openLinkTelegramDialog,
    userToLinkTelegram,
    openManageTeamsDialog,
    userToManageTeams,
    handleOpenLinkTelegramDialog,
    handleCloseLinkTelegramDialog,
    handleLinkTelegram,
    handleOpenManageTeamsDialog,
    handleCloseManageTeamsDialog,
    handleAddUserToTeam,
    handleRemoveUserFromTeam
    } = useCreatorUsers(notify);

  const [telegramLinkCode, setTelegramLinkCode] = React.useState('');
  const [selectedTeamToAdd, setSelectedTeamToAdd] = React.useState('');
  const [selectedRoleToAdd, setSelectedRoleToAdd] = React.useState('member');

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
        onLinkTelegram={handleOpenLinkTelegramDialog}
        onManageTeams={handleOpenManageTeamsDialog}
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

      {/* Link Telegram Dialog */}
      <Dialog open={openLinkTelegramDialog} onClose={handleCloseLinkTelegramDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Lier le compte Telegram</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Lier le compte Telegram de <strong>{userToLinkTelegram?.username}</strong>.
            Demandez à l'utilisateur de vous fournir le code de liaison généré par le bot Telegram.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            id="telegramCode"
            label="Code de liaison Telegram"
            type="text"
            fullWidth
            variant="outlined"
            onChange={(e) => setTelegramLinkCode(e.target.value)}
            value={telegramLinkCode}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLinkTelegramDialog} disabled={formLoading}>Annuler</Button>
          <Button onClick={() => handleLinkTelegram(telegramLinkCode)} color="primary" variant="contained" disabled={formLoading || !telegramLinkCode}>
            {formLoading ? <CircularProgress size={24} /> : 'Lier'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Teams Dialog */}
      <Dialog open={openManageTeamsDialog} onClose={handleCloseManageTeamsDialog} maxWidth="md" fullWidth>
        <DialogTitle>Gérer les équipes de {userToManageTeams?.username}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Ajouter ou retirer <strong>{userToManageTeams?.username}</strong> des équipes.
          </Typography>
          {userToManageTeams?.teams && userToManageTeams.teams.length > 0 ? (
            <List>
              {userToManageTeams.teams.map((teamEntry) => (
                <ListItem
                  key={teamEntry.team._id}
                  secondaryAction={
                    <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveUserFromTeam(teamEntry.team._id)} disabled={formLoading}>
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemText primary={teamEntry.team.name} secondary={`Rôle: ${teamEntry.role}`} />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography>Cet utilisateur n'est membre d'aucune équipe.</Typography>
          )}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6">Ajouter à une équipe</Typography>
            <FormControl fullWidth margin="dense">
              <InputLabel id="select-team-label">Sélectionner une équipe</InputLabel>
              <Select
                labelId="select-team-label"
                value={selectedTeamToAdd || ''}
                onChange={(e) => setSelectedTeamToAdd(e.target.value)}
                label="Sélectionner une équipe"
              >
                {teams.filter(team => !userToManageTeams?.teams.some(ut => ut.team._id === team._id)).map((team) => (
                  <MenuItem key={team._id} value={team._id}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="dense">
              <InputLabel id="select-role-label">Rôle</InputLabel>
              <Select
                labelId="select-role-label"
                value={selectedRoleToAdd}
                onChange={(e) => setSelectedRoleToAdd(e.target.value)}
                label="Rôle"
              >
                <MenuItem value="member">Membre</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleAddUserToTeam(selectedTeamToAdd, selectedRoleToAdd)}
              disabled={formLoading || !selectedTeamToAdd}
              sx={{ mt: 2 }}
            >
              {formLoading ? <CircularProgress size={24} /> : 'Ajouter à l\'équipe'}
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseManageTeamsDialog} disabled={formLoading}>Fermer</Button>
        </DialogActions>
      </Dialog>
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
