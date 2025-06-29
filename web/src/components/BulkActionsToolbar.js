import React from 'react';
import { Toolbar, Tooltip, Checkbox, IconButton } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ClearIcon from '@mui/icons-material/Clear';

const BulkActionsToolbar = ({ allSelected, someSelected, onSelectAll, onBulkApprove, onBulkReject, disabled }) => (
  <Toolbar>
    <Tooltip title="Tout sélectionner">
      <Checkbox
        checked={allSelected}
        indeterminate={someSelected && !allSelected}
        onChange={e => onSelectAll(e.target.checked)}
      />
    </Tooltip>
    <Tooltip title="Approuver sélection">
      <IconButton onClick={onBulkApprove} disabled={disabled}><CheckIcon /></IconButton>
    </Tooltip>
    <Tooltip title="Rejeter sélection">
      <IconButton onClick={onBulkReject} disabled={disabled}><ClearIcon /></IconButton>
    </Tooltip>
  </Toolbar>
);

export default BulkActionsToolbar;
