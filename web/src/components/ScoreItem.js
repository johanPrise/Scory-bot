import React from 'react';
import {
  TableRow,
  TableCell,
  Box,
  Avatar,
  Typography,
  Chip,
  IconButton,
  Checkbox,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const ScoreItem = ({ score, isSelected, onCheckboxClick, onEdit, onDelete }) => {
  const { user, activity, points, approved, createdAt, notes } = score;

  const getStatusChip = (isApproved) => {
    return isApproved ? (
      <Chip
        icon={<CheckCircleIcon />}
        label="Approuvé"
        color="success"
        size="small"
      />
    ) : (
      <Chip
        icon={<PendingIcon />}
        label="En attente"
        color="warning"
        size="small"
      />
    );
  };

  return (
    <TableRow hover selected={isSelected}>
      <TableCell padding="checkbox">
        <Checkbox
          color="primary"
          checked={isSelected}
          onChange={onCheckboxClick}
        />
      </TableCell>
      <TableCell>
        <Box display="flex" alignItems="center">
          <Avatar
            src={user?.avatar}
            alt={user?.name}
            sx={{ width: 32, height: 32, mr: 1 }}
          >
            {user?.name?.charAt(0) || 'U'}
          </Avatar>
          <Box>
            <Typography variant="body2">{user?.name || 'Inconnu'}</Typography>
            <Typography variant="caption" color="textSecondary">
              {user?.email}
            </Typography>
          </Box>
        </Box>
      </TableCell>
      <TableCell>
        <Box>
          <Typography variant="body2">{activity?.name || 'Inconnue'}</Typography>
          {notes && (
            <Tooltip title={notes}>
              <Typography variant="caption" color="textSecondary" noWrap>
                {notes.length > 30 ? `${notes.substring(0, 30)}...` : notes}
              </Typography>
            </Tooltip>
          )}
        </Box>
      </TableCell>
      <TableCell>
        <Chip
          label={points > 0 ? `+${points}` : points}
          color={points > 0 ? 'success' : 'error'}
          variant="outlined"
          size="small"
        />
      </TableCell>
      <TableCell>
        <Tooltip title={format(parseISO(createdAt), 'PPpp', { locale: fr })}>
          <span>{format(parseISO(createdAt), 'dd/MM/yyyy')}</span>
        </Tooltip>
      </TableCell>
      <TableCell>{getStatusChip(approved)}</TableCell>
      <TableCell align="right">
        <Tooltip title="Modifier">
          <IconButton size="small" onClick={onEdit}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Supprimer">
          <IconButton size="small" color="error" onClick={onDelete}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
};

export default ScoreItem;
