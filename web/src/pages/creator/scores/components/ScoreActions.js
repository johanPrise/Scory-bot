import React from 'react';
import {
  Box,
  Button,
  Typography,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  Delete as DeleteIcon,
  GetApp as DownloadIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  PendingActions as PendingActionsIcon
} from '@mui/icons-material';
import { CSVLink } from 'react-csv';
import { format } from 'date-fns';

const ScoreActions = ({
  selectedScores,
  scores,
  onBulkDelete,
  loading,
  exportLoading,
  onExportCSV
}) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleBulkDeleteClick = () => {
    handleClose();
    onBulkDelete();
  };

  // Préparer les données pour l'export CSV
  const csvData = React.useMemo(() => {
    return selectedScores.length > 0
      ? selectedScores.map(score => ({
          'Utilisateur': score.user?.name || 'Inconnu',
          'Email': score.user?.email || '',
          'Activité': score.activity?.name || 'Inconnue',
          'Points': score.points,
          'Statut': score.approved ? 'Approuvé' : 'En attente',
          'Date': format(new Date(score.createdAt), 'dd/MM/yyyy HH:mm'),
          'Notes': score.notes || ''
        }))
      : [];
  }, [selectedScores]);

  if (selectedScores.length === 0) return null;

  return (
    <Box display="flex" alignItems="center" gap={2} mb={2} p={1} bgcolor="action.selected" borderRadius={1}>
      <Typography variant="body2" color="textSecondary">
        {selectedScores.length} élément{selectedScores.length > 1 ? 's' : ''} sélectionné{selectedScores.length > 1 ? 's' : ''}
      </Typography>
      
      <Divider orientation="vertical" flexItem />
      
      <Tooltip title="Supprimer la sélection">
        <Button
          size="small"
          color="error"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
          onClick={handleBulkDeleteClick}
          disabled={loading}
        >
          Supprimer
        </Button>
      </Tooltip>
      
      <Tooltip title="Exporter la sélection">
        <CSVLink
          data={csvData}
          filename={`scores-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`}
          style={{ textDecoration: 'none' }}
        >
          <Button
            size="small"
            color="primary"
            startIcon={exportLoading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
            disabled={exportLoading}
            onClick={onExportCSV}
          >
            Exporter
          </Button>
        </CSVLink>
      </Tooltip>
      
      <Box flexGrow={1} />
      
      <Tooltip title="Plus d'actions">
        <IconButton
          size="small"
          onClick={handleClick}
          aria-label="plus d'actions"
          aria-controls="actions-menu"
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
        >
          <MoreVertIcon />
        </IconButton>
      </Tooltip>
      
      <Menu
        id="actions-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'actions-button',
        }}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <CheckCircleIcon fontSize="small" color="success" />
          </ListItemIcon>
          <ListItemText>Marquer comme approuvé</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <PendingActionsIcon fontSize="small" color="warning" />
          </ListItemIcon>
          <ListItemText>Marquer comme en attente</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ScoreActions;
