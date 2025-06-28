import React from 'react';
import { Paper, Typography } from '@mui/material';
import ScoreHistory from './ScoreHistory';

const DetailedScoreHistory = () => (
  <Paper sx={{ p: 2, mt: 2 }}>
    <Typography variant="h6">Historique détaillé des scores</Typography>
    <ScoreHistory period="all" />
  </Paper>
);

export default DetailedScoreHistory;
