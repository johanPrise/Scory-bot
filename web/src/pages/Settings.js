import React from 'react';
import { Typography, Box, Paper } from '@mui/material';

const Settings = () => {
  return (
    <Box p={3}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body1">
          Application settings will be managed here.
        </Typography>
      </Paper>
    </Box>
  );
};

export default Settings;
