import React from 'react';
import { Typography, Paper, Box } from '@mui/material';

const Activities = () => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Activités
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Liste des activités
        </Typography>
        <Typography color="textSecondary">
          Gestion des activités à venir
        </Typography>
      </Paper>
    </Box>
  );
};

export default Activities;
