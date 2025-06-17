import React, { useState, useEffect } from 'react';
import { getGroupSettings, updateGroupSettings } from '../../api';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Grid,
  Divider,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Save as SaveIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const GroupAdminSettings = () => {
  const [tab, setTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(true);
  const [groupSettings, setGroupSettings] = useState({
    groupName: '',
    description: '',
    privacy: 'public',
    allowMemberInvites: true,
    requireApproval: false,
    notificationFrequency: 'daily',
    emailNotifications: true,
    pushNotifications: false,
  });

  const groupId = localStorage.getItem('groupId');

  useEffect(() => {
    const fetchGroupSettings = async () => {
      try {
        setLoading(true);
        const settingsData = await getGroupSettings(groupId);
        setGroupSettings(settingsData || {
          groupName: '',
          description: '',
          privacy: 'public',
          allowMemberInvites: true,
          requireApproval: false,
          notificationFrequency: 'daily',
          emailNotifications: true,
          pushNotifications: false,
        });
      } catch (error) {
        console.error('Error fetching group settings:', error);
        setSnackbar({ open: true, message: 'Erreur lors du chargement des paramètres du groupe', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    if (groupId) {
      fetchGroupSettings();
    } else {
      setLoading(false);
      setSnackbar({ open: true, message: 'ID de groupe non trouvé', severity: 'error' });
    }
  }, [groupId]);

  const handleTabChange = (e, newValue) => setTab(newValue);

  const handleSettingChange = (e) => setGroupSettings({ ...groupSettings, [e.target.name]: e.target.value });

  const handleSwitchChange = (field) => (e) => {
    setGroupSettings({ ...groupSettings, [field]: e.target.checked });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await updateGroupSettings(groupId, groupSettings);
      setSnackbar({ open: true, message: 'Paramètres du groupe enregistrés !', severity: 'success' });
    } catch (error) {
      console.error('Error saving group settings:', error);
      setSnackbar({ open: true, message: 'Erreur lors de l\'enregistrement des paramètres du groupe', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Paramètres du Groupe
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Gérer les paramètres de votre groupe, les notifications et la confidentialité
        </Typography>
      </Box>
      <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Tabs value={tab} onChange={handleTabChange} aria-label="group settings tabs" variant="scrollable" scrollButtons="auto">
          <Tab label="Général" icon={<SettingsIcon />} iconPosition="start" />
          <Tab label="Notifications" icon={<NotificationsIcon />} iconPosition="start" />
          <Tab label="Confidentialité" icon={<SecurityIcon />} iconPosition="start" />
        </Tabs>
        <Divider />
        <TabPanel value={tab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                margin="normal"
                label="Nom du groupe"
                name="groupName"
                value={groupSettings.groupName}
                onChange={handleSettingChange}
                disabled={loading}
              />
              <TextField
                fullWidth
                margin="normal"
                label="Description"
                name="description"
                multiline
                rows={4}
                value={groupSettings.description}
                onChange={handleSettingChange}
                disabled={loading}
              />
            </Grid>
          </Grid>
          <Box mt={3} display="flex" justifyContent="flex-end">
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={loading}>
              Enregistrer
            </Button>
          </Box>
        </TabPanel>
        <TabPanel value={tab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                margin="normal"
                label="Fréquence des notifications"
                name="notificationFrequency"
                select
                value={groupSettings.notificationFrequency}
                onChange={handleSettingChange}
                disabled={loading}
              >
                <option value="immediate">Immédiat</option>
                <option value="daily">Quotidien</option>
                <option value="weekly">Hebdomadaire</option>
                <option value="never">Jamais</option>
              </TextField>
              <FormControlLabel
                control={<Switch checked={groupSettings.emailNotifications} onChange={handleSwitchChange('emailNotifications')} disabled={loading} />}
                label="Notifications par email"
              />
              <FormControlLabel
                control={<Switch checked={groupSettings.pushNotifications} onChange={handleSwitchChange('pushNotifications')} disabled={loading} />}
                label="Notifications push"
              />
            </Grid>
          </Grid>
          <Box mt={3} display="flex" justifyContent="flex-end">
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={loading}>
              Enregistrer
            </Button>
          </Box>
        </TabPanel>
        <TabPanel value={tab} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                margin="normal"
                label="Confidentialité"
                name="privacy"
                select
                value={groupSettings.privacy}
                onChange={handleSettingChange}
                disabled={loading}
              >
                <option value="public">Public</option>
                <option value="private">Privé</option>
                <option value="secret">Secret</option>
              </TextField>
              <FormControlLabel
                control={<Switch checked={groupSettings.allowMemberInvites} onChange={handleSwitchChange('allowMemberInvites')} disabled={loading} />}
                label="Autoriser les invitations par les membres"
              />
              <FormControlLabel
                control={<Switch checked={groupSettings.requireApproval} onChange={handleSwitchChange('requireApproval')} disabled={loading} />}
                label="Exiger l'approbation pour rejoindre"
              />
            </Grid>
          </Grid>
          <Box mt={3} display="flex" justifyContent="flex-end">
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={loading}>
              Enregistrer
            </Button>
          </Box>
        </TabPanel>
      </Paper>
      <Snackbar open={snackbar.open} autoHideDuration={2500} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GroupAdminSettings;
