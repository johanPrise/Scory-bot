import React, { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../../api';
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
  Api as ApiIcon,
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

const Settings = () => {
  const [tab, setTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(true);
  const [general, setGeneral] = useState({
    siteName: '',
    siteUrl: '',
    language: 'fr',
    maintenanceMode: false,
  });
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    weekly: true,
  });
  const [security, setSecurity] = useState({
    twoFA: true,
    sessionTimeout: 30,
  });
  const [apiKeys, setApiKeys] = useState([]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const settingsData = await getSettings();
        setGeneral(settingsData.general || {
          siteName: 'Scory Bot',
          siteUrl: 'https://scory-bot.example.com',
          language: 'fr',
          maintenanceMode: false,
        });
        setNotifications(settingsData.notifications || {
          email: true,
          push: false,
          weekly: true,
        });
        setSecurity(settingsData.security || {
          twoFA: true,
          sessionTimeout: 30,
        });
        setApiKeys(settingsData.apiKeys || []);
      } catch (error) {
        console.error('Error fetching settings:', error);
        setSnackbar({ open: true, message: 'Erreur lors du chargement des paramètres', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleTabChange = (e, newValue) => setTab(newValue);

  const handleGeneralChange = (e) => setGeneral({ ...general, [e.target.name]: e.target.value });

  const handleSwitchChange = (section, field) => (e) => {
    if (section === 'general') setGeneral({ ...general, [field]: e.target.checked });
    if (section === 'notifications') setNotifications({ ...notifications, [field]: e.target.checked });
    if (section === 'security') setSecurity({ ...security, [field]: e.target.checked });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await updateSettings({ general, notifications, security });
      setSnackbar({ open: true, message: 'Paramètres enregistrés !', severity: 'success' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setSnackbar({ open: true, message: 'Erreur lors de l\'enregistrement des paramètres', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Paramètres
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Gérer les paramètres de l'application, les notifications et la sécurité
        </Typography>
      </Box>
      <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Tabs value={tab} onChange={handleTabChange} aria-label="settings tabs" variant="scrollable" scrollButtons="auto">
          <Tab label="Général" icon={<SettingsIcon />} iconPosition="start" />
          <Tab label="Notifications" icon={<NotificationsIcon />} iconPosition="start" />
          <Tab label="Sécurité" icon={<SecurityIcon />} iconPosition="start" />
          <Tab label="API" icon={<ApiIcon />} iconPosition="start" />
        </Tabs>
        <Divider />
        <TabPanel value={tab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                margin="normal"
                label="Nom du site"
                name="siteName"
                value={general.siteName}
                onChange={handleGeneralChange}
                disabled={loading}
              />
              <TextField
                fullWidth
                margin="normal"
                label="URL du site"
                name="siteUrl"
                value={general.siteUrl}
                onChange={handleGeneralChange}
                disabled={loading}
              />
              <TextField
                fullWidth
                margin="normal"
                label="Langue par défaut"
                name="language"
                value={general.language}
                onChange={handleGeneralChange}
                disabled={loading}
              />
              <FormControlLabel
                control={<Switch checked={general.maintenanceMode} onChange={handleSwitchChange('general', 'maintenanceMode')} disabled={loading} />}
                label="Mode maintenance"
                sx={{ mt: 2 }}
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
              <FormControlLabel
                control={<Switch checked={notifications.email} onChange={handleSwitchChange('notifications', 'email')} disabled={loading} />}
                label="Notifications par email"
              />
              <FormControlLabel
                control={<Switch checked={notifications.push} onChange={handleSwitchChange('notifications', 'push')} disabled={loading} />}
                label="Notifications push"
              />
              <FormControlLabel
                control={<Switch checked={notifications.weekly} onChange={handleSwitchChange('notifications', 'weekly')} disabled={loading} />}
                label="Rapport hebdomadaire"
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
              <FormControlLabel
                control={<Switch checked={security.twoFA} onChange={handleSwitchChange('security', 'twoFA')} disabled={loading} />}
                label="Authentification à deux facteurs"
              />
              <TextField
                fullWidth
                margin="normal"
                label="Délai d'expiration de session (minutes)"
                name="sessionTimeout"
                type="number"
                value={security.sessionTimeout}
                onChange={(e) => setSecurity({ ...security, sessionTimeout: parseInt(e.target.value) || 0 })}
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
        <TabPanel value={tab} index={3}>
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Clés API</Typography>
            <Divider sx={{ mb: 2 }} />
            <Button variant="contained" color="primary" sx={{ mb: 2 }}>Générer une nouvelle clé</Button>
            {apiKeys.length === 0 ? (
              <Typography color="text.secondary">Aucune clé API n'a encore été générée.</Typography>
            ) : (
              apiKeys.map((key) => (
                <Box key={key.id} display="flex" justifyContent="space-between" alignItems="center" p={1} borderBottom="1px solid" borderColor="divider">
                  <Box>
                    <Typography variant="body2">{key.name} - {key.key.substring(0, 8)}...</Typography>
                    <Typography variant="caption" color="text.secondary">Dernière utilisation : {key.lastUsed}</Typography>
                  </Box>
                  <Button color="error" size="small">Supprimer</Button>
                </Box>
              ))
            )}
          </Paper>
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

export default Settings;
