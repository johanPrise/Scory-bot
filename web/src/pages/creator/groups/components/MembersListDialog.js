import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  PersonRemove as PersonRemoveIcon,
  Add as AddIcon,
} from '@mui/icons-material';

const MembersListDialog = ({
  open,
  onClose,
  members,
  onAddMember,
  onRemoveMember,
}) => {
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newMemberEmail.trim()) return;
    setAdding(true);
    await onAddMember(newMemberEmail);
    setNewMemberEmail('');
    setAdding(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Gérer les membres du groupe</DialogTitle>
      <DialogContent dividers>
        <Box display="flex" alignItems="center" mb={2}>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Ajouter par email..."
            value={newMemberEmail}
            onChange={(e) => setNewMemberEmail(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleAdd}
            disabled={adding || !newMemberEmail}
            sx={{ ml: 1 }}
            startIcon={adding ? <CircularProgress size={20} /> : <AddIcon />}
          >
            Ajouter
          </Button>
        </Box>
        <List dense>
          {members.length > 0 ? (
            members.map((member) => (
              <ListItem key={member._id}>
                <ListItemAvatar>
                  <Avatar>{member.username?.charAt(0).toUpperCase() || 'U'}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={member.username || member.email}
                  secondary={member.role}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => onRemoveMember(member._id)}>
                    <PersonRemoveIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))
          ) : (
            <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2 }}>
              Aucun membre dans ce groupe.
            </Typography>
          )}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
};

export default MembersListDialog;
