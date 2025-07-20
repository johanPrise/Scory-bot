import React, { useState } from 'react';
import { Box, Button, TextField, MenuItem, Typography, Alert } from '@mui/material';
import { feedback } from '../api';

const FEEDBACK_TYPES = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Suggestion' },
  { value: 'other', label: 'Autre' }
];

const FeedbackForm = ({ onSuccess, activityId }) => {
  const [type, setType] = useState('bug');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!message.trim()) {
      setError('Merci de saisir un message.');
      return;
    }
    setLoading(true);
    try {
      await feedback.send(type, message, activityId);
      setSuccess(true);
      setMessage('');
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
      <Typography variant="h6" gutterBottom>Envoyer un retour d'expérience</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>Merci pour votre retour !</Alert>}
      <TextField
        select
        label="Type"
        value={type}
        onChange={e => setType(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      >
        {FEEDBACK_TYPES.map(option => (
          <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
        ))}
      </TextField>
      <TextField
        label="Message"
        value={message}
        onChange={e => setMessage(e.target.value)}
        multiline
        minRows={3}
        fullWidth
        sx={{ mb: 2 }}
      />
      <Button type="submit" variant="contained" color="primary" disabled={loading} fullWidth>
        Envoyer
      </Button>
    </Box>
  );
};

export default FeedbackForm;
