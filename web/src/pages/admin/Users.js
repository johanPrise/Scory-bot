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
  DialogContentText,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { getUsers, updateUser, deleteUser, createUser } from '../../api';
import { useAuth } from '../../context/AuthContext';

const Users = () => {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  // Formulaire d'édition/création
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    role: 'user',
    password: '',
    confirmPassword: '',
    telegramId: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getUsers();
      setUsers(response.users || []);
    } catch (err) {
      console.error('Erreur lors du chargement des utilisateurs:', err);
      setError(err.message || 'Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditUser = (user) => {
    setCurrentUser(user);
    setFormData({
      username: user.username || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      role: user.role || 'user',
      password: '',
      confirmPassword: '',
      telegramId: user.telegramId || ''
    });
    setOpenEditDialog(true);
  };

  const handleDeleteUser = (user) => {
    setCurrentUser(user);
    setOpenDeleteDialog(true);
  };

  const handleCreateNewUser = () => {
    setFormData({
      username: '',
      firstName: '',
      lastName: '',
      email: '',
      role: 'user',
      password: '',
      confirmPassword: '',
      telegramId: ''
    });
    setOpenCreateDialog(true);
  };

  const submitEditUser = async () => {
    try {
      if (formData.password && formData.password !== formData.confirmPassword) {
        setNotification({
          open: true,
          message: 'Les mots de passe ne correspondent pas',
          severity: 'error'
        });
        return;
      }

      // Supprimer les champs non nécessaires pour l'API
      const userData = { ...formData };
      delete userData.confirmPassword;
      if (!userData.password) delete userData.password;

      await updateUser(currentUser._id, userData);
      setOpenEditDialog(false);
      setNotification({
        open: true,
        message: 'Utilisateur mis à jour avec succès',
        severity: 'success'
      });
      loadUsers();
    } catch (err) {
      setNotification({
        open: true,
        message: err.message || 'Erreur lors de la mise à jour de l\'utilisateur',
        severity: 'error'
      });
    }
  };

  const submitDeleteUser = async () => {
    try {
      await deleteUser(currentUser._id);
      setOpenDeleteDialog(false);
      setNotification({
        open: true,
        message: 'Utilisateur supprimé avec succès',
        severity: 'success'
      });
      loadUsers();
    } catch (err) {
      setNotification({
        open: true,
        message: err.message || 'Erreur lors de la suppression de l\'utilisateur',
        severity: 'error'
      });
    }
  };

  const submitCreateUser = async () => {
    try {
      if (formData.password !== formData.confirmPassword) {
        setNotification({
          open: true,
          message: 'Les mots de passe ne correspondent pas',
          severity: 'error'
        });
        return;
      }

      // Supprimer les champs non nécessaires pour l'API
      const userData = { ...formData };
      delete userData.confirmPassword;

      await createUser(userData);
      setOpenCreateDialog(false);
      setNotification({
        open: true,
        message: 'Utilisateur créé avec succès',
        severity: 'success'
      });
      loadUsers();
    } catch (err) {
      setNotification({
        open: true,
        message: err.message || 'Erreur lors de la création de l\'utilisateur',
        severity: 'error'
      });
    }
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'creator':
        return 'warning';
      case 'groupAdmin':
        return 'info';
      default:
        return 'default';
    }
  };

  if (!hasPermission('manage_users')) {
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
          Gestion des utilisateurs
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleCreateNewUser}
        >
          Nouvel utilisateur
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
                  <TableCell>Nom d'utilisateur</TableCell>
                  <TableCell>Nom</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Rôle</TableCell>
                  <TableCell>ID Telegram</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user._id} hover>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{`${user.firstName || ''} ${user.lastName || ''}`}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip 
                          label={user.role || 'user'} 
                          color={getRoleColor(user.role)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{user.telegramId || '-'}</TableCell>
                      <TableCell align="right">
                        <IconButton 
                          color="primary" 
                          onClick={() => handleEditUser(user)}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          color="error" 
                          onClick={() => handleDeleteUser(user)}
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
                      Aucun utilisateur trouvé
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Dialog d'édition */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Modifier l'utilisateur</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nom d'utilisateur"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Prénom"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                fullWidth
              />
              <TextField
                label="Nom"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                fullWidth
              />
            </Box>
            <TextField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Rôle</InputLabel>
              <Select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                label="Rôle"
              >
                <MenuItem value="user">Utilisateur</MenuItem>
                <MenuItem value="groupAdmin">Admin de groupe</MenuItem>
                <MenuItem value="creator">Créateur</MenuItem>
                <MenuItem value="admin">Administrateur</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="ID Telegram"
              name="telegramId"
              value={formData.telegramId}
              onChange={handleInputChange}
              fullWidth
            />
            <TextField
              label="Nouveau mot de passe"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              fullWidth
              helperText="Laissez vide pour conserver le mot de passe actuel"
            />
            {formData.password && (
              <TextField
                label="Confirmer le mot de passe"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                fullWidth
                required
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Annuler</Button>
          <Button onClick={submitEditUser} variant="contained" color="primary">
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de suppression */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer l'utilisateur "{currentUser?.username}" ? 
            Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Annuler</Button>
          <Button onClick={submitDeleteUser} variant="contained" color="error">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de création */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouvel utilisateur</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nom d'utilisateur"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Prénom"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                fullWidth
              />
              <TextField
                label="Nom"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                fullWidth
              />
            </Box>
            <TextField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Rôle</InputLabel>
              <Select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                label="Rôle"
              >
                <MenuItem value="user">Utilisateur</MenuItem>
                <MenuItem value="groupAdmin">Admin de groupe</MenuItem>
                <MenuItem value="creator">Créateur</MenuItem>
                <MenuItem value="admin">Administrateur</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="ID Telegram"
              name="telegramId"
              value={formData.telegramId}
              onChange={handleInputChange}
              fullWidth
            />
            <TextField
              label="Mot de passe"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              fullWidth
              required
            />
            <TextField
              label="Confirmer le mot de passe"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              fullWidth
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Annuler</Button>
          <Button onClick={submitCreateUser} variant="contained" color="primary">
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

export default Users;