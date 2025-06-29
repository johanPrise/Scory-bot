import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper, TextField, Button, List, ListItem, ListItemText, IconButton, Chip, Stack, CircularProgress } from '@mui/material';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

function formatTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

const Timers = () => {
  const [timers, setTimers] = useState([]); // [{name, endTime, duration, running, startedAt}]
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const intervalRef = useRef();

  // Synchronisation régulière avec l'API
  useEffect(() => {
    let sync = true;
    const fetchTimers = async () => {
      setSyncing(true);
      try {
        const res = await fetch('/api/timers');
        const data = await res.json();
        if (sync) setTimers(data.timers || []);
      } catch (e) {
        // ignore
      } finally {
        setSyncing(false);
      }
    };
    fetchTimers();
    intervalRef.current = setInterval(fetchTimers, 2000);
    return () => { sync = false; clearInterval(intervalRef.current); };
  }, []);

  // Démarrer un timer via API
  const handleStart = async () => {
    setError(null);
    if (!name.trim() || !duration || isNaN(duration) || duration <= 0) {
      setError('Nom et durée valides requis');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/timers/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, duration })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur API');
      setName('');
      setDuration('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Arrêter un timer via API
  const handleStop = async (timerName) => {
    setLoading(true);
    try {
      const res = await fetch('/api/timers/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: timerName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur API');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Calcul du temps restant
  const getRemaining = (timer) => {
    if (!timer.running) return 0;
    return Math.max(0, timer.endTime - Date.now());
  };

  return (
    <Box sx={{ maxWidth: 420, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>Minuteurs</Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField label="Nom" value={name} onChange={e => setName(e.target.value)} size="small" />
          <TextField label="Durée (min)" value={duration} onChange={e => setDuration(e.target.value.replace(/[^0-9]/g, ''))} size="small" inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', min: 1 }} />
          <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={handleStart} disabled={loading}>Démarrer</Button>
        </Stack>
        {error && <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>}
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>Timers actifs {syncing && <CircularProgress size={16} sx={{ ml: 1 }} />}</Typography>
        <List>
          {timers.filter(t => t.running).length === 0 && (
            <ListItem><ListItemText primary="Aucun timer actif" /></ListItem>
          )}
          {timers.filter(t => t.running).map((timer, idx) => (
            <ListItem key={timer.name + idx} secondaryAction={
              <IconButton edge="end" color="error" onClick={() => handleStop(timer.name)} disabled={loading}>
                <StopIcon />
              </IconButton>
            }>
              <ListItemText
                primary={<>
                  <Chip label={timer.name} color="primary" size="small" sx={{ mr: 1 }} />
                  <span>Fin à {new Date(timer.endTime).toLocaleTimeString()}</span>
                </>}
                secondary={<span>Temps restant : <b>{formatTime(getRemaining(timer))}</b></span>}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
      {timers.filter(t => !t.running).length > 0 && (
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>Historique</Typography>
          <List>
            {timers.filter(t => !t.running).map((timer, idx) => (
              <ListItem key={timer.name + idx}>
                <ListItemText
                  primary={<>
                    <Chip label={timer.name} size="small" sx={{ mr: 1 }} />
                    <span>Terminé à {new Date(timer.endTime).toLocaleTimeString()}</span>
                  </>}
                  secondary={<span>Durée réelle : <b>{formatTime(timer.endTime - timer.startedAt)}</b></span>}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default Timers;
