import React, { useState } from 'react';
import { Fab, Tooltip, Box, Fade, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import FeedbackIcon from '@mui/icons-material/Feedback';
import FeedbackForm from './FeedbackForm';

const ActivityFeedbackButton = ({ activityId }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title="Donner un feedback pour cette activité">
        <Fab size="small" color="secondary" aria-label="feedback" onClick={() => setOpen(true)} sx={{ ml: 1 }}>
          <FeedbackIcon fontSize="small" />
        </Fab>
      </Tooltip>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Feedback sur l'activité</DialogTitle>
        <DialogContent>
          <FeedbackForm activityId={activityId} onSuccess={() => setOpen(false)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ActivityFeedbackButton;
