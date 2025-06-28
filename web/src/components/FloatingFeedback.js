import React, { useState } from 'react';
import { Fab, Tooltip, Box, Fade } from '@mui/material';
import FeedbackIcon from '@mui/icons-material/Feedback';
import FeedbackForm from './FeedbackForm';

const FloatingFeedback = () => {
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1300 }}>
      <Fade in={!open}>
        <Tooltip title="Donner un feedback" placement="left">
          <Fab color="primary" aria-label="feedback" onClick={() => setOpen(true)}>
            <FeedbackIcon />
          </Fab>
        </Tooltip>
      </Fade>
      <Fade in={open}>
        <Box sx={{ position: 'absolute', bottom: 70, right: 0, width: 360, boxShadow: 3, borderRadius: 2, bgcolor: 'background.paper', p: 2 }}>
          <FeedbackForm onSuccess={() => setOpen(false)} />
          <Box sx={{ textAlign: 'right', mt: 1 }}>
            <Fab size="small" color="default" onClick={() => setOpen(false)} aria-label="fermer">
              ×
            </Fab>
          </Box>
        </Box>
      </Fade>
    </Box>
  );
};

export default FloatingFeedback;
