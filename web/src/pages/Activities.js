import React, { useEffect, useState } from 'react';
import { Button, Typography, Box, Dialog, DialogTitle, DialogContent, DialogActions, Paper } from '@mui/material';
import { activities } from '../api';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import ActivityFeedbackButton from '../components/ActivityFeedbackButton';
import ActivityTimers from '../components/ActivityTimers';

const Activities = () => {
  const [activities, setActivities] = useState([]);
  const [openForm, setOpenForm] = useState(false);
  const [activityName, setActivityName] = useState("");
  const [activityDesc, setActivityDesc] = useState("");
  const [openSubForm, setOpenSubForm] = useState(null); // id de l'activité ou null
  const [subName, setSubName] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activityHistory, setActivityHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editSubForm, setEditSubForm] = useState({ activityId: null, sub: null });
  const [editSubName, setEditSubName] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { currentUser } = useAuth();
  const { notify } = useNotification();

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const data = await activities.getAll();
        setActivities(data);
      } catch (err) {
        notify('Erreur lors du chargement des activités', 'error');
      }
    };
    fetchActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenForm = () => setOpenForm(true);
  const handleCloseForm = () => setOpenForm(false);

  const handleCreateActivity = async () => {
    if (!activityName.trim()) return;
    try {
      const newActivity = await activities.create({
        name: activityName,
        description: activityDesc,
        createdBy: currentUser?.id || currentUser?._id,
      });
      setActivities([newActivity, ...activities]);
      setActivityName("");
      setActivityDesc("");
      setOpenForm(false);
      notify('Activité créée avec succès', 'success');
    } catch (err) {
      notify('Erreur lors de la création', 'error');
    }
  };

  const handleOpenSubForm = (id) => {
    setOpenSubForm(id);
    setSubName("");
  };
  const handleCloseSubForm = () => setOpenSubForm(null);

  const handleAddSubActivity = async (activityId) => {
    if (!subName.trim()) return;
    try {
      const updated = await activities.subActivities.add(activityId, {
        name: subName,
        createdBy: currentUser?.id || currentUser?._id,
      });
      setActivities(acts => acts.map(act => act._id === updated._id ? updated : act));
      setSubName("");
      setOpenSubForm(null);
      notify('Sous-activité ajoutée', 'success');
    } catch (err) {
      notify('Erreur lors de l\'ajout de la sous-activité', 'error');
    }
  };

  const handleOpenHistory = async (activity) => {
    setSelectedActivity(activity);
    setHistoryOpen(true);
    setActivityHistory([]);
    setHistoryLoading(true);
    try {
      const res = await activities.getHistory({ activityId: activity.id || activity._id });
      // If backend returns { history: [...] }
      setActivityHistory(res.history || []);
    } catch (err) {
      setActivityHistory([]);
      notify('Erreur lors du chargement de l\'historique', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };
  const handleCloseHistory = () => {
    setHistoryOpen(false);
    setSelectedActivity(null);
  };

  const handleOpenEditSub = (activityId, sub) => {
    setEditSubForm({ activityId, sub });
    setEditSubName(sub.name);
  };
  const handleCloseEditSub = () => {
    setEditSubForm({ activityId: null, sub: null });
    setEditSubName("");
  };
  const handleEditSubActivity = async () => {
    if (!editSubName.trim()) return;
    try {
      const updated = await activities.subActivities.update(editSubForm.activityId, editSubForm.sub.id, { name: editSubName });
      setActivities(acts => acts.map(act => act._id === updated._id ? updated : act));
      notify('Sous-activité modifiée', 'success');
      handleCloseEditSub();
    } catch (err) {
      notify('Erreur lors de la modification', 'error');
    }
  };
  const handleDeleteSubActivity = async (activityId, subId) => {
    setDeleteLoading(true);
    try {
      await activities.subActivities.delete(activityId, subId);
      setActivities(acts => acts.map(act => {
        if (act.id === activityId || act._id === activityId) {
          return { ...act, subActivities: (act.subActivities || []).filter(s => s.id !== subId && s._id !== subId) };
        }
        return act;
      }));
      notify('Sous-activité supprimée', 'success');
    } catch (err) {
      notify('Erreur lors de la suppression', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Gestion des Activités
      </Typography>
      <Button variant="contained" color="primary" onClick={handleOpenForm} sx={{ mb: 2 }}>
        Créer une activité
      </Button>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Liste des activités
        </Typography>
        <Box mt={2}>
          {activities.length === 0 ? (
            <Typography color="textSecondary">Aucune activité pour le moment.</Typography>
          ) : (
            activities.map((activity) => (
              <Box key={activity.id} mb={2} p={2} border={1} borderRadius={2}>
                <Typography variant="h6">{activity.name}</Typography>
                {activity.description && (
                  <Typography color="textSecondary" sx={{ mb: 1 }}>{activity.description}</Typography>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <ActivityFeedbackButton activityId={activity.id || activity._id} />
                </Box>
                <ActivityTimers activityId={activity.id || activity._id} />
                <Box>
                  <Typography variant="subtitle2">Sous-activités :</Typography>
                  {activity.subActivities && activity.subActivities.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {activity.subActivities.map(sub => (
                        <li key={sub.id || sub._id} style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ flex: 1 }}>{sub.name}</span>
                          <IconButton size="small" onClick={() => handleOpenEditSub(activity.id, sub)}><EditIcon fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteSubActivity(activity.id, sub.id || sub._id)} disabled={deleteLoading}><DeleteIcon fontSize="small" /></IconButton>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Typography color="textSecondary">Aucune</Typography>
                  )}
                  <Button size="small" onClick={() => handleOpenSubForm(activity.id)} sx={{ mt: 1, mr: 1 }}>
                    Ajouter une sous-activité
                  </Button>
                  <Button size="small" color="secondary" onClick={() => handleOpenHistory(activity)} sx={{ mt: 1 }}>
                    Historique
                  </Button>
                  {/* Dialog d'ajout de sous-activité */}
                  <Dialog open={openSubForm === activity.id} onClose={handleCloseSubForm}>
                    <DialogTitle>Ajouter une sous-activité</DialogTitle>
                    <DialogContent>
                      <input
                        type="text"
                        value={subName}
                        onChange={e => setSubName(e.target.value)}
                        style={{ width: '100%', marginTop: 8, padding: 8, fontSize: 16 }}
                        placeholder="Nom de la sous-activité"
                      />
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={handleCloseSubForm}>Annuler</Button>
                      <Button variant="contained" color="primary" onClick={() => handleAddSubActivity(activity.id)} disabled={!subName.trim()}>
                        Ajouter
                      </Button>
                    </DialogActions>
                  </Dialog>
                </Box>
              </Box>
            ))
          )}
        </Box>
      </Paper>
      {/* Dialog de création d'activité */}
      <Dialog open={openForm} onClose={handleCloseForm}>
        <DialogTitle>Créer une nouvelle activité</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            <Typography variant="subtitle1">Nom de l'activité</Typography>
            <input
              type="text"
              value={activityName}
              onChange={e => setActivityName(e.target.value)}
              style={{ width: '100%', marginBottom: 12, padding: 8, fontSize: 16 }}
              placeholder="Nom de l'activité"
            />
            <Typography variant="subtitle1">Description</Typography>
            <textarea
              value={activityDesc}
              onChange={e => setActivityDesc(e.target.value)}
              style={{ width: '100%', minHeight: 60, padding: 8, fontSize: 16 }}
              placeholder="Description (optionnelle)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm}>Annuler</Button>
          <Button variant="contained" color="primary" onClick={handleCreateActivity} disabled={!activityName.trim()}>
            Créer
          </Button>
        </DialogActions>
      </Dialog>
      {/* Dialog historique d'activité */}
      <Dialog open={historyOpen} onClose={handleCloseHistory} maxWidth="sm" fullWidth>
        <DialogTitle>Historique de l'activité</DialogTitle>
        <DialogContent>
          {selectedActivity ? (
            <Box>
              <Typography variant="h6">{selectedActivity.name}</Typography>
              {historyLoading ? (
                <Typography>Chargement...</Typography>
              ) : (
                <ul>
                  {activityHistory.length === 0 ? (
                    <li>Aucune entrée d'historique.</li>
                  ) : (
                    activityHistory.map((h, idx) => (
                      <li key={idx}>
                        <strong>{new Date(h.createdAt || h.date).toLocaleString()}</strong> — {h.action || h.type || h.event || 'Action'} <em>({h.by || h.user || ''})</em>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseHistory}>Fermer</Button>
        </DialogActions>
      </Dialog>
      {/* Dialog d'édition de sous-activité */}
      <Dialog open={!!editSubForm.sub} onClose={handleCloseEditSub}>
        <DialogTitle>Modifier la sous-activité</DialogTitle>
        <DialogContent>
          <input
            type="text"
            value={editSubName}
            onChange={e => setEditSubName(e.target.value)}
            style={{ width: '100%', marginTop: 8, padding: 8, fontSize: 16 }}
            placeholder="Nom de la sous-activité"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditSub}>Annuler</Button>
          <Button variant="contained" color="primary" onClick={handleEditSubActivity} disabled={!editSubName.trim()}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Activities;
