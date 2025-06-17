import React, { useEffect, useState } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../../api';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Divider,
  Alert,
  Snackbar,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  Menu,
  TablePagination,
} from '@mui/material';
import {
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Group as GroupIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
  MoreVert as MoreVertIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';

const initialUsers = [
  {
    id: 1,
    name: 'Jean Dupont',
    email: 'jean.dupont@example.com',
    role: 'admin',
    status: 'active',
    lastActive: '2025-06-10T09:00:00',
    groups: ['Groupe A', 'Groupe B'],
    avatar: '',
  },
  {
    id: 2,
    name: 'Marie Martin',
    email: 'marie.martin@example.com',
    role: 'user',
    status: 'active',
    lastActive: '2025-06-09T20:15:00',
    groups: ['Groupe A'],
    avatar: '',
  },
  {
    id: 3,
    name: 'Pierre Durand',
    email: 'pierre.durand@example.com',
    role: 'user',
    status: 'inactive',
    lastActive: '2025-06-05T16:45:00',
    groups: ['Groupe C'],
    avatar: '',
  },
  {
    id: 4,
    name: 'Sophie Lambert',
    email: 'sophie.lambert@example.com',
    role: 'moderator',
    status: 'active',
    lastActive: '2025-06-08T09:20:00',
    groups: ['Groupe B', 'Groupe C'],
    avatar: '',
  },
  {
    id: 5,
    name: 'Thomas Moreau',
    email: 'thomas.moreau@example.com',
    role: 'user',
    status: 'suspended',
    lastActive: '2025-05-28T11:10:00',
    groups: ['Groupe A'],
    avatar: '',
  },
];

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ username: '', email: '', role: 'user', password: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Charger les utilisateurs
  useEffect(() => {
    setLoading(true);
    getUsers()
      .then(data => { setUsers(data); setError(null); })
      .catch(e => setError(e.message || 'Erreur lors du chargement des utilisateurs'))
      .finally(() => setLoading(false));
  }, []);

  // Ouvrir le dialogue pour ajouter ou éditer un utilisateur
  const openDialog = (user = null) => {
    setEditUser(user);
    setForm(user ? { username: user.username, email: user.email, role: user.role, password: '' } : { username: '', email: '', role: 'user', password: '' });
    setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setEditUser(null); };

  // Ajouter ou éditer un utilisateur
  const handleSave = async () => {
    try {
      if (editUser) {
        await updateUser(editUser.id, form);
        setSnackbar({ open: true, message: 'Utilisateur modifié !', severity: 'success' });
      } else {
        await createUser(form);
        setSnackbar({ open: true, message: 'Utilisateur ajouté !', severity: 'success' });
      }
      // Recharge les utilisateurs
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
      closeDialog();
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'Erreur lors de la sauvegarde', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Supprimer un utilisateur
  const handleDelete = async (userId) => {
    if (!window.confirm('Supprimer cet utilisateur ?')) return;
    try {
      await deleteUser(userId);
      setSnackbar({ open: true, message: 'Utilisateur supprimé', severity: 'success' });
      setUsers(await getUsers());
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'Erreur lors de la suppression', severity: 'error' });
    }
  };

  const handleMenuOpen = (event, userId) => {
    setAnchorEl(event.currentTarget);
    setSelectedUserId(userId);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUserId(null);
  };
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });
  const getStatusChip = (status) => {
    switch (status) {
      case 'active':
        return <Chip label="Actif" color="success" size="small" />;
      case 'inactive':
        return <Chip label="Inactif" size="small" variant="outlined" />;
      case 'suspended':
        return <Chip label="Suspendu" color="error" size="small" />;
      default:
        return <Chip label="Inconnu" size="small" />;
    }
  };
  const getRoleChip = (role) => {
    switch (role) {
      case 'admin':
        return <Chip label="Administrateur" color="primary" size="small" />;
      case 'moderator':
        return <Chip label="Modérateur" color="secondary" size="small" />;
      case 'user':
        return <Chip label="Utilisateur" size="small" variant="outlined" />;
      default:
        return <Chip label="Inconnu" size="small" />;
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" height={300}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Utilisateurs
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Gérer les utilisateurs de l’application, leur rôle et leur statut d’accès.
        </Typography>
      </Box>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Box sx={{ mr: 2, color: 'primary.main' }}>
                  <PersonIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h6">{users.length}</Typography>
                  <Typography variant="body2" color="textSecondary">Utilisateurs</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Box sx={{ mr: 2, color: 'success.main' }}>
                  <CheckCircleIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h6">{users.filter(u => u.status === 'active').length}</Typography>
                  <Typography variant="body2" color="textSecondary">Actifs</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Box sx={{ mr: 2, color: 'warning.main' }}>
                  <GroupIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h6">{[...new Set(users.flatMap(u => u.groups))].length}</Typography>
                  <Typography variant="body2" color="textSecondary">Groupes uniques</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center" mb={2}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              variant="outlined"
              size="small"
              placeholder="Rechercher un utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              fullWidth
            />
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Rôle</InputLabel>
              <Select
                value={roleFilter}
                label="Rôle"
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <MenuItem value="all">Tous</MenuItem>
                <MenuItem value="admin">Administrateur</MenuItem>
                <MenuItem value="moderator">Modérateur</MenuItem>
                <MenuItem value="user">Utilisateur</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Statut</InputLabel>
              <Select
                value={statusFilter}
                label="Statut"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">Tous</MenuItem>
                <MenuItem value="active">Actif</MenuItem>
                <MenuItem value="inactive">Inactif</MenuItem>
                <MenuItem value="suspended">Suspendu</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => openDialog()}>Ajouter un utilisateur</Button>
          </Grid>
        </Grid>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Utilisateur</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Rôle</TableCell>
                <TableCell>Groupes</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Dernière activité</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">Aucun utilisateur trouvé</TableCell>
                </TableRow>
              ) : (
                filteredUsers
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((user) => (
                    <TableRow hover key={user.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: 32, height: 32, mr: 2, borderRadius: '50%', backgroundColor: 'primary.main', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            {user.name.charAt(0)}
                          </Box>
                          {user.name}
                        </Box>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleChip(user.role)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {user.groups.map((group, idx) => (
                            <Chip key={idx} label={group} size="small" variant="outlined" />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>{getStatusChip(user.status)}</TableCell>
                      <TableCell>{new Date(user.lastActive).toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={(e) => handleMenuOpen(e, user.id)}>
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredUsers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Lignes par page:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`}
        />
      </Paper>
      {/* Menu contextuel pour actions utilisateurs */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
      >
        <MenuItem>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Modifier</ListItemText>
        </MenuItem>
        <MenuItem>
          <ListItemIcon><BlockIcon fontSize="small" color="warning" /></ListItemIcon>
          <ListItemText>Désactiver</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Supprimer</ListItemText>
        </MenuItem>
      </Menu>
      {/* Dialogue d'ajout/édition */}
      <Dialog open={dialogOpen} onClose={closeDialog}>
        <DialogTitle>{editUser ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'}</DialogTitle>
        <DialogContent>
          <TextField label="Nom d'utilisateur" name="username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} fullWidth margin="normal" />
          <TextField label="Email" name="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} fullWidth margin="normal" />
          <TextField label="Rôle" name="role" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} select fullWidth margin="normal" SelectProps={{ native: true }}>
            <option value="user">Utilisateur</option>
            <option value="groupAdmin">Admin de groupe</option>
            <option value="creator">Créateur</option>
          </TextField>
          {!editUser && <TextField label="Mot de passe" name="password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} fullWidth margin="normal" />}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Annuler</Button>
          <Button onClick={handleSave} variant="contained">Enregistrer</Button>
        </DialogActions>
      </Dialog>
      {/* Snackbar feedback */}
      <Snackbar open={snackbar.open} autoHideDuration={2500} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Users;
