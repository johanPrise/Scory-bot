import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Alert, Chip } from '@mui/material';

const typeColor = {
  bug: 'error',
  feature: 'info',
  other: 'default'
};

const AdminFeedbackList = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/feedback/global', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        if (!res.ok) throw new Error('Erreur lors du chargement des feedbacks');
        const data = await res.json();
        setFeedbacks(data.feedbacks || []);
      } catch (err) {
        setError(err.message || 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };
    fetchFeedbacks();
  }, []);

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>Feedbacks Utilisateurs (Global)</Typography>
      {loading && <CircularProgress sx={{ my: 4 }} />}
      {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
      {!loading && !error && (
        <Paper sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Utilisateur</TableCell>
                <TableCell>ChatId</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {feedbacks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">Aucun feedback</TableCell>
                </TableRow>
              ) : feedbacks.map((fb, idx) => (
                <TableRow key={idx}>
                  <TableCell>{new Date(fb.date).toLocaleString()}</TableCell>
                  <TableCell><Chip label={fb.type} color={typeColor[fb.type] || 'default'} size="small" /></TableCell>
                  <TableCell>{fb.message}</TableCell>
                  <TableCell>{fb.username}</TableCell>
                  <TableCell>{fb.chatId || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
};

export default AdminFeedbackList;
