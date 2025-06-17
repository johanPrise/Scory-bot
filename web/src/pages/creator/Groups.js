import React, { useEffect, useState } from 'react';
import { getGroups, createGroup, updateGroup, deleteGroup } from '../../api';
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
  TablePagination,
  IconButton,
  Tooltip,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Group as GroupIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  People as PeopleIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', isPublic: true });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  // Charger les groupes
  useEffect(() => {
    setLoading(true);
    getGroups()
      .then(data => { setGroups(data); setError(null); })
      .catch(e => setError(e.message || 'Erreur lors du chargement des groupes'))
      .finally(() => setLoading(false));
  }, []);

  // Ouvrir le dialogue pour ajouter ou éditer un groupe
  const openDialog = (group = null) => {
    setEditGroup(group);
    setForm(group ? { name: group.name, description: group.description, isPublic: group.isPublic } : { name: '', description: '', isPublic: true });
    setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setEditGroup(null); };

  // Ajouter ou éditer un groupe
  const handleSave = async () => {
    try {
      if (editGroup) {
        await updateGroup(editGroup.id, form);
        setSnackbar({ open: true, message: 'Groupe modifié !', severity: 'success' });
      } else {
        await createGroup(form);
        setSnackbar({ open: true, message: 'Groupe ajouté !', severity: 'success' });
      }
      // Recharge les groupes
      setLoading(true);
      const data = await getGroups();
      setGroups(data);
      closeDialog();
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'Erreur lors de la sauvegarde', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Supprimer un groupe
  const handleDelete = async (groupId) => {
    if (!window.confirm('Supprimer ce groupe ?')) return;
    try {
      await deleteGroup(groupId);
      setSnackbar({ open: true, message: 'Groupe supprimé', severity: 'success' });
      setGroups(await getGroups());
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'Erreur lors de la suppression', severity: 'error' });
    }
  };

  const handleMenuOpen = (event, groupId) => {
    setAnchorEl(event.currentTarget);
    setSelectedGroupId(groupId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedGroupId(null);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleStatusChange = (groupId, isActive) => {
    setGroups(groups.map(group => 
      group.id === groupId ? { ...group, active: isActive } : group
    ));
    handleMenuClose();
  };

  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.plan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" height={300}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Groupes
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Gérez les groupes utilisant votre application
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Box sx={{ mr: 2, color: 'primary.main' }}>
                  <GroupIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h6">{groups.length}</Typography>
                  <Typography variant="body2" color="textSecondary">Groupes actifs</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Box sx={{ mr: 2, color: 'success.main' }}>
                  <PeopleIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h6">
                    {groups.reduce((sum, group) => sum + group.members, 0)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">Membres au total</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Box sx={{ mr: 2, color: 'warning.main' }}>
                  <BarChartIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h6">
                    {Math.round(groups.filter(g => g.active).length / groups.length * 100)}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">Taux d'activation</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Rechercher un groupe..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
          <Box>
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              sx={{ mr: 1 }}
            >
              Filtres
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => openDialog()}
            >
              Ajouter un groupe
            </Button>
          </Box>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nom du groupe</TableCell>
                <TableCell align="center">Membres</TableCell>
                <TableCell>Créé le</TableCell>
                <TableCell>Dernière activité</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell align="center">Statut</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredGroups
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((group) => (
                  <TableRow hover key={group.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <GroupIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        {group.name}
                      </Box>
                    </TableCell>
                    <TableCell align="center">{group.members}</TableCell>
                    <TableCell>{new Date(group.created).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(group.lastActive).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Chip 
                        label={group.plan} 
                        size="small" 
                        color={group.plan === 'Premium' ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={group.active ? 'Actif' : 'Inactif'}
                        color={group.active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, group.id)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredGroups.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Lignes par page:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`
          }
        />
      </Paper>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
      >
        <MenuItem>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Modifier</ListItemText>
        </MenuItem>
        {groups.find(g => g.id === selectedGroupId)?.active ? (
          <MenuItem onClick={() => handleStatusChange(selectedGroupId, false)}>
            <ListItemIcon>
              <BlockIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Désactiver</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem onClick={() => handleStatusChange(selectedGroupId, true)}>
            <ListItemIcon>
              <CheckCircleIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText>Activer</ListItemText>
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={() => handleDelete(selectedGroupId)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Supprimer</ListItemText>
        </MenuItem>
      </Menu>

      {/* Dialogue d'ajout/édition */}
      <Dialog open={dialogOpen} onClose={closeDialog}>
        <DialogTitle>{editGroup ? 'Modifier le groupe' : 'Ajouter un groupe'}</DialogTitle>
        <DialogContent>
          <TextField label="Nom" name="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} fullWidth margin="normal" />
          <TextField label="Description" name="description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} fullWidth margin="normal" />
          <TextField label="Public" name="isPublic" value={form.isPublic} onChange={e => setForm({ ...form, isPublic: e.target.value === 'true' })} select fullWidth margin="normal" SelectProps={{ native: true }}>
            <option value="true">Oui</option>
            <option value="false">Non</option>
          </TextField>
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

export default Groups;
