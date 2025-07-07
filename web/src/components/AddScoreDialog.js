import React, { useState, useEffect } from 'react';
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
  Button,
  Grid,
  Switch,
  FormControlLabel,
  Avatar,
  Box,
  Chip,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon, Save as SaveIcon } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';

const AddScoreDialog = ({ open, onClose, onSubmit, score, users, activities, loading }) => {
  const [formData, setFormData] = useState({
    userId: '',
    activityId: '',
    points: 0,
    notes: '',
    approved: true,
  });

  useEffect(() => {
    if (score) {
      setFormData({
        userId: score.user?._id || score.userId || '',
        activityId: score.activity?._id || score.activityId || '',
        points: score.points || 0,
        notes: score.notes || '',
        approved: score.approved !== undefined ? score.approved : true,
      });
    } else {
      setFormData({
        userId: '',
        activityId: '',
        points: 0,
        notes: '',
        approved: true,
      });
    }
  }, [score, open]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleActivityChange = (e) => {
    const activityId = e.target.value;
    const activity = activities.find((a) => a._id === activityId);
    setFormData((prev) => ({
      ...prev,
      activityId,
      points: activity ? activity.points : prev.points,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {score ? 'Modifier le score' : 'Ajouter un score'}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Utilisateur</InputLabel>
                <Select
                  name="userId"
                  value={formData.userId}
                  onChange={handleChange}
                  label="Utilisateur"
                  disabled={!!score}
                >
                  {users.map((user) => (
                    <MenuItem key={user._id} value={user._id}>
                      <Box display="flex" alignItems="center">
                        <Avatar src={user.avatar} sx={{ width: 24, height: 24, mr: 1 }}>
                          {user.name?.charAt(0)}
                        </Avatar>
                        {user.name} ({user.email})
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Activité</InputLabel>
                <Select
                  name="activityId"
                  value={formData.activityId}
                  onChange={handleActivityChange}
                  label="Activité"
                >
                  {activities
                    .filter((activity) => activity.isActive)
                    .map((activity) => (
                      <MenuItem key={activity._id} value={activity._id}>
                        <Box display="flex" justifyContent="space-between" width="100%">
                          <span>{activity.name}</span>
                          <Chip
                            label={`${activity.points} pts`}
                            size="small"
                            color={activity.points > 0 ? 'success' : 'error'}
                            variant="outlined"
                          />
                        </Box>
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Points"
                name="points"
                type="number"
                value={formData.points}
                onChange={handleChange}
                margin="normal"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.approved}
                    onChange={handleChange}
                    name="approved"
                  />
                }
                label={formData.approved ? 'Approuvé' : 'En attente'}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                margin="normal"
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>Annuler</Button>
          <Button type="submit" variant="contained" color="primary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : <SaveIcon />}
            {score ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddScoreDialog;
