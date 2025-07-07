import React from 'react';
import { Typography, Box, Paper } from '@mui/material';

const GroupScores = () => {
  return (
    <Box p={3}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Group Scores
        </Typography>
        <Typography variant="body1">
          Group scores will be displayed here.
        </Typography>
      </Paper>
    </Box>
  );
};

export default GroupScores;
