import React from 'react';
import { Typography, Paper, Box } from '@mui/material';

const Rankings = () => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Classements
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Classement des joueurs et équipes
        </Typography>
        <Typography color="textSecondary">
          Visualisation des classements à venir
        </Typography>
      </Paper>
    </Box>
  );
};

export default Rankings;
