import React from 'react';
import {
  TableRow,
  TableCell,
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Avatar,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const GroupItem = ({ group, onEdit, onDelete, onManageMembers }) => {
  const { name, description, memberCount, isActive, createdAt } = group;

  return (
    <TableRow hover>
      <TableCell>
        <Box display="flex" alignItems="center">
          <Avatar sx={{ mr: 2, bgcolor: 'secondary.main' }}>
            <GroupIcon />
          </Avatar>
          <Typography variant="body1">{name}</Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Typography variant="body2" noWrap maxWidth={300}>
          {description || 'Aucune description'}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          icon={<PeopleIcon />}
          label={`${memberCount || 0} membres`}
          variant="outlined"
          onClick={onManageMembers}
          sx={{ cursor: 'pointer' }}
        />
      </TableCell>
      <TableCell>
        <Chip
          icon={isActive ? <CheckCircleIcon /> : <CancelIcon />}
          label={isActive ? 'Actif' : 'Inactif'}
          color={isActive ? 'success' : 'error'}
          size="small"
        />
      </TableCell>
      <TableCell>
        {format(new Date(createdAt), 'PP', { locale: fr })}
      </TableCell>
      <TableCell align="right">
        <Tooltip title="Gérer les membres">
          <IconButton size="small" onClick={onManageMembers}>
            <PeopleIcon fontSize="small" />
          </IconButton>
        </Tooltip>
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

export default GroupItem;
