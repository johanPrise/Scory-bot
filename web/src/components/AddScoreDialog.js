import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button
} from '@mui/material';

const AddScoreDialog = ({ open, onClose, onAdd, newScore, setNewScore, activitiesList, loading }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>Ajouter un score</DialogTitle>
    <DialogContent>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Activité</InputLabel>
        <Select
          value={newScore.activity}
          label="Activité"
          onChange={e => setNewScore(s => ({ ...s, activity: e.target.value }))}
        >
          {activitiesList.map(act => (
            <MenuItem key={act._id} value={act._id}>{act.name}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        fullWidth
        label="Points"
        type="number"
        value={newScore.points}
        onChange={e => setNewScore(s => ({ ...s, points: e.target.value }))}
        sx={{ mb: 2 }}
      />
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Type</InputLabel>
        <Select
          value={newScore.type}
          label="Type"
          onChange={e => setNewScore(s => ({ ...s, type: e.target.value }))}
        >
          <MenuItem value="personal">Personnel</MenuItem>
          <MenuItem value="team">Équipe</MenuItem>
        </Select>
      </FormControl>
      {newScore.type === 'team' && (
        <TextField
          fullWidth
          label="ID de l'équipe (à améliorer)"
          value={newScore.team}
          onChange={e => setNewScore(s => ({ ...s, team: e.target.value }))}
          sx={{ mb: 2 }}
        />
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Annuler</Button>
      <Button 
        variant="contained" 
        color="primary" 
        onClick={onAdd} 
        disabled={!newScore.activity || !newScore.points || loading}
      >
        Ajouter
      </Button>
    </DialogActions>
  </Dialog>
);

export default AddScoreDialog;
