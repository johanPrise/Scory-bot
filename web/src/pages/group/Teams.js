import React from 'react';
import { Typography, Box, Paper } from '@mui/material';

const GroupTeams = () => {
  return (
    <Box p={3}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Group Teams
        </Typography>
        <Typography variant="body1">
          Group teams will be managed here.
        </Typography>
      </Paper>
    </Box>
  );
};

export default GroupTeams;
