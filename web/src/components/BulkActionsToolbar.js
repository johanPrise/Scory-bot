import React from 'react';
import { Toolbar, Tooltip, IconButton, Typography, Box } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';

const BulkActionsToolbar = ({ numSelected, onDelete }) => (
  <Toolbar
    sx={{
      pl: { sm: 2 },
      pr: { xs: 1, sm: 1 },
      bgcolor: 'primary.lighter',
      borderRadius: 1,
    }}
  >
    <Box sx={{ flex: '1 1 100%' }}>
      <Typography color="inherit" variant="subtitle1" component="div">
        {numSelected} sélectionné(s)
      </Typography>
    </Box>
    <Tooltip title="Supprimer">
      <IconButton onClick={onDelete}>
        <DeleteIcon />
      </IconButton>
    </Tooltip>
  </Toolbar>
);

export default BulkActionsToolbar;
