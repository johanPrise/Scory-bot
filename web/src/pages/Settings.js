import React from 'react';
import { Typography, Paper, Box } from '@mui/material';

const Settings = () => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Paramètres
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Paramètres de l'application
        </Typography>
        <Typography color="textSecondary">
          Configuration des paramètres à venir
        </Typography>
      </Paper>
    </Box>
  );
};

export default Settings;
