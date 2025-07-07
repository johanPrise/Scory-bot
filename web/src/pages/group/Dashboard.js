import React from 'react';
import { Typography, Box, Paper } from '@mui/material';

const GroupDashboard = () => {
  return (
    <Box p={3}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Group Dashboard
        </Typography>
        <Typography variant="body1">
          Welcome to your group dashboard.
        </Typography>
      </Paper>
    </Box>
  );
};

export default GroupDashboard;
