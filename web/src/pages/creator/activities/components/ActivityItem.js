import React from 'react';
import {
  TableRow,
  TableCell,
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const ActivityItem = ({ activity, onEdit, onDelete }) => {
  const { name, description, settings, updatedAt, isDefault } = activity;

  return (
    <TableRow hover>
      <TableCell>
        <Box display="flex" alignItems="center">
          {name}
          {isDefault && (
            <Tooltip title="Activité par défaut (non modifiable)">
              <InfoIcon color="action" fontSize="small" sx={{ ml: 1 }} />
            </Tooltip>
          )}
        </Box>
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="textSecondary" noWrap>
          {description || 'Aucune description'}
        </Typography>
      </TableCell>
      <TableCell align="center">
        <Chip
          label={settings?.isActive ? 'Active' : 'Inactive'}
          color={settings?.isActive ? 'success' : 'default'}
          size="small"
          icon={settings?.isActive ? <CheckCircleIcon /> : <CancelIcon />}
        />
      </TableCell>
      <TableCell align="center">
        {updatedAt ? (
          <Tooltip title={format(parseISO(updatedAt), 'PPpp', { locale: fr })}>
            <span>{format(parseISO(updatedAt), 'dd/MM/yyyy')}</span>
          </Tooltip>
        ) : (
          'N/A'
        )}
      </TableCell>
      <TableCell align="right">
        <Tooltip title="Modifier">
          <span>
            <IconButton size="small" onClick={onEdit} disabled={isDefault}>
              <EditIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Supprimer">
          <span>
            <IconButton size="small" color="error" onClick={onDelete} disabled={isDefault}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
};

export default ActivityItem;
