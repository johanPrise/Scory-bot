import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Grid,
  CircularProgress
} from '@mui/material';
import { Save as SaveIcon, Close as CloseIcon } from '@mui/icons-material';

const ScoreForm = ({ 
  open, 
  onClose, 
  score, 
  users = [], 
  activities = [], 
  onSubmit, 
  loading 
}) => {
  const [formData, setFormData] = useState({
    userId: '',
    activityId: '',
    points: 0,
    notes: '',
    approved: true
  });

  // Mettre à jour le formulaire quand le score ou l'ouverture change
  useEffect(() => {
    if (score) {
      setFormData({
        userId: score.user?._id || score.userId || '',
        activityId: score.activity?._id || score.activityId || '',
        points: score.points || 0,
        notes: score.notes || '',
        approved: score.approved !== undefined ? score.approved : true
      });
    } else {
      setFormData({
        userId: '',
        activityId: '',
        points: 0,
        notes: '',
        approved: true
      });
    }
  }, [score, open]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await onSubmit(formData);
    if (success) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {score ? 'Modifier le score' : 'Ajouter un nouveau score'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Utilisateur</InputLabel>
                <Select
                  name="userId"
                  value={formData.userId}
                  onChange={handleChange}
                  label="Utilisateur"
                >
                  {users.map((user) => (
                    <MenuItem key={user._id} value={user._id}>
                      {user.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Activité</InputLabel>
                <Select
                  name="activityId"
                  value={formData.activityId}
                  onChange={handleChange}
                  label="Activité"
                >
                  {activities.map((activity) => (
                    <MenuItem key={activity._id} value={activity._id}>
                      {activity.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                name="points"
                label="Points"
                value={formData.points}
                onChange={handleChange}
                required
                inputProps={{ min: 0 }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                name="notes"
                label="Notes"
                value={formData.notes}
                onChange={handleChange}
                multiline
                rows={3}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.approved}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        approved: e.target.checked
                      }))
                    }
                    name="approved"
                    color="primary"
                  />
                }
                label="Approuvé"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit">
            Annuler
          </Button>
          <Button
            type="submit"
            color="primary"
            variant="contained"
            disabled={loading}
            startIcon={
              loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
          >
            {score ? 'Mettre à jour' : 'Ajouter'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ScoreForm;
