import React, { useState } from 'react';
import { Fab, Tooltip, Box, Fade } from '@mui/material';
import TimerIcon from '@mui/icons-material/Timer';
import Timers from './Timers';

const FloatingTimers = () => {
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ position: 'fixed', bottom: 100, right: 24, zIndex: 1300 }}>
      <Fade in={!open}>
        <Tooltip title="Minuteurs" placement="left">
          <Fab color="secondary" aria-label="timers" onClick={() => setOpen(true)}>
            <TimerIcon />
          </Fab>
        </Tooltip>
      </Fade>
      <Fade in={open}>
        <Box sx={{ position: 'absolute', bottom: 70, right: 0, width: 400, boxShadow: 3, borderRadius: 2, bgcolor: 'background.paper', p: 2 }}>
          <Timers />
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

export default FloatingTimers;
