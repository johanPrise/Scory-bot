import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { teams } from '../api';
import { useNotification } from '../context/NotificationContext';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  CircularProgress,
  Fab,
  Menu,
  MenuItem,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  Star as StarIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';

const TeamCard = ({ team, onEdit, onDelete, onViewMembers, currentUserId }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const isOwner = team.createdBy._id === currentUserId;
  const isAdmin = team.members?.some(member => 
    member.userId._id === currentUserId && member.isAdmin
  );

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            {team.name}
          </Typography>
          <IconButton size="small" onClick={handleMenuOpen}>
            <MoreVertIcon />
          </IconButton>
        </Box>

        <Typography variant="body2" color="textSecondary" paragraph>
          {team.description || 'Aucune description'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip 
            icon={<GroupIcon />} 
            label={`${team.members?.length || 0} membres`} 
            size="small" 
            variant="outlined"
          />
          {team.stats && (
            <Chip 
              label={`${team.stats.totalScore || 0} points`} 
              size="small" 
              color="primary"
              variant="outlined"
            />
          )}
          {isOwner && (
            <Chip 
              icon={<StarIcon />}
              label="Propriétaire" 
              size="small" 
              color="warning"
            />
          )}
          {isAdmin && !isOwner && (
            <Chip 
              icon={<AdminIcon />}
              label="Admin" 
              size="small" 
              color="secondary"
            />
          )}
        </Box>

        <Typography variant="caption" color="textSecondary">
          Créée par {team.createdBy.username} le {new Date(team.createdAt).toLocaleDateString('fr-FR')}
        </Typography>
      </CardContent>

      <CardActions>
        <Button size="small" onClick={() => onViewMembers(team)}>
          Voir les membres
        </Button>
        {(isOwner || isAdmin) && (
          <Button size="small" onClick={() => onEdit(team)}>
            Modifier
          </Button>
        )}
      </CardActions>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => { onViewMembers(team); handleMenuClose(); }}>
          <PersonIcon sx={{ mr: 1 }} /> Voir les membres
        </MenuItem>
        {(isOwner || isAdmin) && [
          <MenuItem key="edit" onClick={() => { onEdit(team); handleMenuClose(); }}>
            <EditIcon sx={{ mr: 1 }} /> Modifier
          </MenuItem>,
          <Divider key="divider" />,
          <MenuItem key="delete" onClick={() => { onDelete(team); handleMenuClose(); }} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1 }} /> Supprimer
          </MenuItem>
        ]}
      </Menu>
    </Card>
  );
};

const CreateTeamDialog = ({ open, onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    chatId: '',
    settings: {
      maxMembers: 10,
      isPrivate: false
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field) => (e) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: e.target.value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: e.target.value
      }));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Créer une nouvelle équipe</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nom de l'équipe"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleInputChange('name')}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={formData.description}
            onChange={handleInputChange('description')}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="ID du chat Telegram"
            fullWidth
            variant="outlined"
            value={formData.chatId}
            onChange={handleInputChange('chatId')}
            required
            helperText="L'ID du chat Telegram où cette équipe sera active"
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Nombre maximum de membres"
            type="number"
            fullWidth
            variant="outlined"
            value={formData.settings.maxMembers}
            onChange={handleInputChange('settings.maxMembers')}
            inputProps={{ min: 1, max: 100 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Créer'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const MembersDialog = ({ open, onClose, team, onAddMember, onRemoveMember, currentUserId }) => {
  const [newMemberData, setNewMemberData] = useState({ userId: '', username: '' });
  const [loading, setLoading] = useState(false);

  const isOwner = team?.createdBy._id === currentUserId;
  const isAdmin = team?.members?.some(member => 
    member.userId._id === currentUserId && member.isAdmin
  );

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberData.username.trim()) return;

    setLoading(true);
    try {
      await onAddMember(team._id, { username: newMemberData.username });
      setNewMemberData({ userId: '', username: '' });
    } catch (error) {
      console.error('Erreur lors de l\'ajout du membre:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Membres de l'équipe "{team?.name}"
      </DialogTitle>
      <DialogContent>
        {(isOwner || isAdmin) && (
          <Box component="form" onSubmit={handleAddMember} sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Ajouter un membre
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                label="Nom d'utilisateur"
                value={newMemberData.username}
                onChange={(e) => setNewMemberData(prev => ({ ...prev, username: e.target.value }))}
                sx={{ flexGrow: 1 }}
              />
              <Button 
                type="submit" 
                variant="contained" 
                startIcon={<PersonAddIcon />}
                disabled={loading || !newMemberData.username.trim()}
              >
                Ajouter
              </Button>
            </Box>
          </Box>
        )}

        <List>
          {team?.members?.map((member) => (
            <ListItem key={member.userId._id}>
              <ListItemAvatar>
                <Avatar>
                  {member.isAdmin ? <AdminIcon /> : <PersonIcon />}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1">
                      {member.userId.username}
                    </Typography>
                    {member.userId._id === team.createdBy._id && (
                      <Chip label="Propriétaire" size="small" color="warning" />
                    )}
                    {member.isAdmin && member.userId._id !== team.createdBy._id && (
                      <Chip label="Admin" size="small" color="secondary" />
                    )}
                  </Box>
                }
                secondary={`Rejoint le ${new Date(member.joinedAt).toLocaleDateString('fr-FR')}`}
              />
              {(isOwner || isAdmin) && member.userId._id !== team.createdBy._id && member.userId._id !== currentUserId && (
                <ListItemSecondaryAction>
                  <Tooltip title="Retirer de l'équipe">
                    <IconButton 
                      edge="end" 
                      onClick={() => onRemoveMember(team._id, member.userId._id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              )}
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
};

const Teams = () => {
  const { currentUser } = useAuth();
  const { notify } = useNotification();
  const [teamsList, setTeamsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await teams.getAll({
        includeMembers: 'true',
        includeStats: 'true'
      });
      
      setTeamsList(response.teams || []);
    } catch (err) {
      console.error('Erreur lors du chargement des équipes:', err);
      setError(err.message || 'Erreur lors du chargement des équipes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (teamData) => {
    setCreateLoading(true);
    try {
      await teams.create(teamData);
      setCreateDialogOpen(false);
      await loadTeams();
      notify('Équipe créée avec succès', 'success');
    } catch (err) {
      setError(err.message || 'Erreur lors de la création de l\'équipe');
      notify('Erreur lors de la création de l\'équipe', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditTeam = (team) => {
    // TODO: Implémenter la modification d'équipe
    console.log('Modifier équipe:', team);
  };

  const handleDeleteTeam = async (team) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'équipe "${team.name}" ?`)) {
      return;
    }

    try {
      await teams.delete(team._id);
      await loadTeams();
      notify('Équipe supprimée', 'success');
    } catch (err) {
      console.error('Erreur lors de la suppression de l\'équipe:', err);
      setError(err.message || 'Erreur lors de la suppression de l\'équipe');
      notify('Erreur lors de la suppression de l\'équipe', 'error');
    }
  };

  const handleViewMembers = async (team) => {
    try {
      // Récupérer les détails complets de l'équipe avec les membres
      const teamDetails = await teams.getById(team._id, { includeMembers: 'true' });
      setSelectedTeam(teamDetails.team);
      setMembersDialogOpen(true);
      notify('Membres de l\'équipe chargés', 'info');
    } catch (err) {
      console.error('Erreur lors du chargement des membres:', err);
      setError(err.message || 'Erreur lors du chargement des membres');
      notify('Erreur lors du chargement des membres', 'error');
    }
  };

  const handleAddMember = async (teamId, memberData) => {
    try {
      await teams.members.add(teamId, memberData);
      // Recharger les détails de l'équipe
      const teamDetails = await teams.getById(teamId, { includeMembers: 'true' });
      setSelectedTeam(teamDetails.team);
      await loadTeams(); // Recharger la liste principale
      notify('Membre ajouté à l\'équipe', 'success');
    } catch (err) {
      notify('Erreur lors de l\'ajout du membre', 'error');
      throw err; // Propager l'erreur pour la gestion dans le composant
    }
  };

  const handleRemoveMember = async (teamId, userId) => {
    try {
      await teams.members.remove(teamId, userId);
      // Recharger les détails de l'équipe
      const teamDetails = await teams.getById(teamId, { includeMembers: 'true' });
      setSelectedTeam(teamDetails.team);
      await loadTeams(); // Recharger la liste principale
      notify('Membre retiré de l\'équipe', 'success');
    } catch (err) {
      console.error('Erreur lors de la suppression du membre:', err);
      setError(err.message || 'Erreur lors de la suppression du membre');
      notify('Erreur lors de la suppression du membre', 'error');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Équipes
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Gérez vos équipes et leurs membres
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {teamsList.map((team) => (
          <Grid item xs={12} sm={6} md={4} key={team._id}>
            <TeamCard
              team={team}
              onEdit={handleEditTeam}
              onDelete={handleDeleteTeam}
              onViewMembers={handleViewMembers}
              currentUserId={currentUser?.id}
            />
          </Grid>
        ))}
        
        {teamsList.length === 0 && !loading && (
          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <GroupIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Aucune équipe trouvée
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Créez votre première équipe pour commencer à organiser vos activités.
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Créer une équipe
              </Button>
            </Box>
          </Grid>
        )}
      </Grid>

      {/* Bouton flottant pour créer une équipe */}
      {teamsList.length > 0 && (
        <Fab
          color="primary"
          aria-label="Créer une équipe"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setCreateDialogOpen(true)}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Dialog de création d'équipe */}
      <CreateTeamDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateTeam}
        loading={createLoading}
      />

      {/* Dialog des membres */}
      <MembersDialog
        open={membersDialogOpen}
        onClose={() => setMembersDialogOpen(false)}
        team={selectedTeam}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
        currentUserId={currentUser?.id}
      />
    </Box>
  );
};

export default Teams;