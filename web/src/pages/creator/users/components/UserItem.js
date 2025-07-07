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
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const UserItem = ({ user, onEdit, onDelete, isCurrentUser }) => {
  const { username, email, role, lastLogin, isActive } = user;

  const getRoleChip = (role) => {
    const roleMap = {
      creator: { label: 'Créateur', color: 'primary' },
      groupAdmin: { label: 'Admin Groupe', color: 'secondary' },
      user: { label: 'Utilisateur', color: 'default' },
    };
    const { label, color } = roleMap[role] || roleMap.user;
    return <Chip label={label} color={color} size="small" />;
  };

  return (
    <TableRow hover>
      <TableCell>
        <Box display="flex" alignItems="center">
          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
            {username.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body1">{username}</Typography>
        </Box>
      </TableCell>
      <TableCell>{email}</TableCell>
      <TableCell>{getRoleChip(role)}</TableCell>
      <TableCell>
        {lastLogin
          ? format(new Date(lastLogin), 'PPpp', { locale: fr })
          : 'Jamais'}
      </TableCell>
      <TableCell>
        <Chip
          icon={isActive ? <CheckCircleIcon /> : <CancelIcon />}
          label={isActive ? 'Actif' : 'Inactif'}
          color={isActive ? 'success' : 'error'}
          size="small"
        />
      </TableCell>
      <TableCell align="right">
        <Tooltip title="Modifier">
          <IconButton size="small" onClick={onEdit}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={isCurrentUser ? "Vous ne pouvez pas vous supprimer" : "Supprimer"}>
          <span>
            <IconButton
              size="small"
              color="error"
              onClick={onDelete}
              disabled={isCurrentUser}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
};

export default UserItem;
