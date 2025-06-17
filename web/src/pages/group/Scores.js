import React, { useEffect, useState } from 'react';
import { getGroupScores, addGroupScore, updateGroupScore, deleteGroupScore } from '../../api';
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
  Grid,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  EmojiEvents as EmojiEventsIcon
} from '@mui/icons-material';

const Scores = ({ groupId: groupIdProp = null }) => {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editScore, setEditScore] = useState(null);
  const [form, setForm] = useState({ team: '', user: '', value: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const groupId = groupIdProp || localStorage.getItem('groupId') || 'demo-group-id'; // Récupérer groupId depuis localStorage ou props

  // Charger les scores du groupe
  useEffect(() => {
    setLoading(true);
    getGroupScores(groupId)
      .then(data => { setScores(data); setError(null); })
      .catch(e => setError(e.message || 'Erreur lors du chargement des scores'))
      .finally(() => setLoading(false));
  }, [groupId]);

  // Ouvrir le dialogue pour ajouter ou éditer un score
  const openDialog = (score = null) => {
    setEditScore(score);
    setForm(score ? { team: score.team, user: score.user, value: score.value } : { team: '', user: '', value: '' });
    setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setEditScore(null); };

  // Ajouter ou éditer un score
  const handleSave = async () => {
    try {
      if (editScore) {
        await updateGroupScore(groupId, editScore.id, form);
        setSnackbar({ open: true, message: 'Score modifié !', severity: 'success' });
      } else {
        await addGroupScore(groupId, form);
        setSnackbar({ open: true, message: 'Score ajouté !', severity: 'success' });
      }
      // Recharge les scores
      setLoading(true);
      const data = await getGroupScores(groupId);
      setScores(data);
      closeDialog();
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'Erreur lors de la sauvegarde', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Supprimer un score
  const handleDelete = async (scoreId) => {
    if (!window.confirm('Supprimer ce score ?')) return;
    try {
      await deleteGroupScore(groupId, scoreId);
      setSnackbar({ open: true, message: 'Score supprimé', severity: 'success' });
      setScores(await getGroupScores(groupId));
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
          Scores du groupe
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Historique et gestion des scores pour ce groupe
        </Typography>
      </Box>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Box sx={{ mr: 2, color: 'success.main' }}>
                  <EmojiEventsIcon fontSize="large" />
                </Box>
                <Box>
                  <Typography variant="h6">{scores.length}</Typography>
                  <Typography variant="body2" color="textSecondary">Scores enregistrés</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Historique des scores</Typography>
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => openDialog()}>Ajouter un score</Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Équipe</TableCell>
                <TableCell>Utilisateur</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scores.map((score) => (
                <TableRow key={score.id}>
                  <TableCell>{score.team}</TableCell>
                  <TableCell>{score.user}</TableCell>
                  <TableCell>
                    <Chip label={`+${score.value}`} color="success" />
                  </TableCell>
                  <TableCell>{new Date(score.date).toLocaleString()}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openDialog(score)}><EditIcon /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(score.id)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      {/* Dialogue d'ajout/édition */}
      <Dialog open={dialogOpen} onClose={closeDialog}>
        <DialogTitle>{editScore ? 'Modifier le score' : 'Ajouter un score'}</DialogTitle>
        <DialogContent>
          <TextField label="Équipe" value={form.team} onChange={e => setForm({ ...form, team: e.target.value })} fullWidth margin="normal" />
          <TextField label="Utilisateur" value={form.user} onChange={e => setForm({ ...form, user: e.target.value })} fullWidth margin="normal" />
          <TextField label="Score" type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} fullWidth margin="normal" />
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

export default Scores;
