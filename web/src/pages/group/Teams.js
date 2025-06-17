import React, { useEffect, useState } from 'react';
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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { getGroupTeams, addGroupTeam, updateGroupTeam, deleteGroupTeam } from '../../api';

const Teams = ({ groupId: groupIdFromProps = null }) => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTeam, setEditTeam] = useState(null);
  const [form, setForm] = useState({ name: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const groupId = groupIdFromProps || localStorage.getItem('groupId') || 'demo-group-id';

  useEffect(() => {
    setLoading(true);
    getGroupTeams(groupId)
      .then(data => { setTeams(data); setError(null); })
      .catch(e => setError(e.message || 'Erreur lors du chargement'))
      .finally(() => setLoading(false));
  }, [groupId]);

  const openDialog = (team = null) => {
    setEditTeam(team);
    setForm(team ? { name: team.name } : { name: '' });
    setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setEditTeam(null); };

  const handleSave = async () => {
    try {
      if (editTeam) {
        await updateGroupTeam(groupId, editTeam.id, form);
        setSnackbar({ open: true, message: 'Équipe modifiée !', severity: 'success' });
      } else {
        await addGroupTeam(groupId, form);
        setSnackbar({ open: true, message: 'Équipe ajoutée !', severity: 'success' });
      }
      setLoading(true);
      const data = await getGroupTeams(groupId);
      setTeams(data);
      closeDialog();
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'Erreur lors de la sauvegarde', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (teamId) => {
    if (!window.confirm('Supprimer cette équipe ?')) return;
    try {
      await deleteGroupTeam(groupId, teamId);
      setSnackbar({ open: true, message: 'Équipe supprimée', severity: 'success' });
      setTeams(await getGroupTeams(groupId));
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'Erreur lors de la suppression', severity: 'error' });
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" height={300}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Équipes du groupe
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Gestion des équipes et de leurs membres
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
                  <Typography variant="h6">{teams.length}</Typography>
                  <Typography variant="body2" color="textSecondary">Équipes</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Liste des équipes</Typography>
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => openDialog()}>Ajouter une équipe</Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Membres</TableCell>
                <TableCell>Score</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell>{team.name}</TableCell>
                  <TableCell>
                    <Chip label={team.members || 0} icon={<GroupIcon />} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip label={team.score || 0} color="success" size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openDialog(team)}><EditIcon /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(team.id)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <Dialog open={dialogOpen} onClose={closeDialog}>
        <DialogTitle>{editTeam ? 'Modifier l\'équipe' : 'Ajouter une équipe'}</DialogTitle>
        <DialogContent>
          <TextField label="Nom" name="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} fullWidth margin="normal" />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Annuler</Button>
          <Button onClick={handleSave} variant="contained">Enregistrer</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={2500} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Teams;
