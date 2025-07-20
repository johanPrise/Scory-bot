import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { getUserSettings, updateUserSettings, changePassword } from '../../api';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Switch,
  Divider,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Save as SaveIcon,
  Visibility,
  VisibilityOff,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountCircleIcon,
  Api as ApiIcon,
  Palette as PaletteIcon,
  Telegram as TelegramIcon
} from '@mui/icons-material';

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const a11yProps = (index) => ({
  id: `settings-tab-${index}`,
  'aria-controls': `settings-tabpanel-${index}`,
});

const Settings = () => {
  const { currentUser, updateUserProfile, linkTelegram, unlinkTelegram } = useAuth();
  const { notify } = useNotification();
  
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [settings, setSettings] = useState({
    // Profil
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    
    // Notifications
    emailNotifications: true,
    pushNotifications: true,
    scoreUpdates: true,
    weeklyReports: true,
    
    // Apparence
    theme: 'light',
    language: 'fr',
    fontSize: 14,
    
    // Sécurité
    twoFactorAuth: false,
    sessionTimeout: 30,
    
    // Intégrations
    telegramBotEnabled: false,
    telegramChatId: '',
    telegramId: '',
    telegramUsername: '',
    
    // API
    apiKey: '••••••••••••',
    apiQuota: 1000,
    apiUsage: 0,
    
    // Sauvegarde
    autoBackup: true,
    backupFrequency: 'daily',
    lastBackup: null
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const data = await getUserSettings();
        setSettings(prev => ({
          ...prev,
          ...data,
          // Ne pas écraser les mots de passe avec des données du serveur
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } catch (error) {
        console.error('Error loading settings:', error);
        notify('Erreur lors du chargement des paramètres', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      loadSettings();
    }
  }, [currentUser, notify]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Vérifier si les nouveaux mots de passe correspondent
      if (settings.newPassword && settings.newPassword !== settings.confirmPassword) {
        throw new Error('Les nouveaux mots de passe ne correspondent pas');
      }
      
      // Préparer les données à envoyer
      const dataToSend = { ...settings };
      
      // Ne pas envoyer les champs vides du mot de passe
      if (!dataToSend.currentPassword) {
        delete dataToSend.currentPassword;
        delete dataToSend.newPassword;
        delete dataToSend.confirmPassword;
      } else if (dataToSend.currentPassword && dataToSend.newPassword) {
        await changePassword(dataToSend.currentPassword, dataToSend.newPassword);
        delete dataToSend.currentPassword;
        delete dataToSend.newPassword;
        delete dataToSend.confirmPassword;
      }
      
      // Appeler l'API de mise à jour
      const updatedSettings = await updateUserSettings(dataToSend);
      
      // Mettre à jour l'état local
      setSettings(prev => ({
        ...prev,
        ...updatedSettings,
        // Réinitialiser les champs de mot de passe
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
      // Mettre à jour le profil utilisateur si nécessaire
      if (updatedSettings.username || updatedSettings.email) {
        updateUserProfile({
          username: updatedSettings.username || currentUser.username,
          email: updatedSettings.email || currentUser.email
        });
      }
      
      notify('Paramètres enregistrés avec succès', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      notify(error.message || 'Erreur lors de la sauvegarde des paramètres', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetForm = () => {
    if (window.confirm('Voulez-vous vraiment réinitialiser tous les paramètres ?')) {
      setSettings(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleGenerateApiKey = () => {
    if (window.confirm('Générer une nouvelle clé API révoquera l\'ancienne. Continuer ?')) {
      const newApiKey = `sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      setSettings(prev => ({
        ...prev,
        apiKey: newApiKey
      }));
      notify('Nouvelle clé API générée avec succès', 'success');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="settings tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<AccountCircleIcon />} label="Profil" {...a11yProps(0)} />
          <Tab icon={<NotificationsIcon />} label="Notifications" {...a11yProps(1)} />
          <Tab icon={<PaletteIcon />} label="Apparence" {...a11yProps(2)} />
          <Tab icon={<SecurityIcon />} label="Sécurité" {...a11yProps(3)} />
          <Tab icon={<TelegramIcon />} label="Intégrations" {...a11yProps(4)} />
          <Tab icon={<ApiIcon />} label="API" {...a11yProps(5)} />
        </Tabs>
      </Box>

      <Paper elevation={3} sx={{ mt: 3, mb: 4 }}>
        <Box component="form" onSubmit={handleSubmit}>
          {/* Onglet Profil */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom>
              Informations du profil
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Nom d'utilisateur"
                  name="username"
                  value={settings.username}
                  onChange={handleChange}
                  margin="normal"
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Adresse email"
                  name="email"
                  type="email"
                  value={settings.email}
                  onChange={handleChange}
                  margin="normal"
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" gutterBottom>
                  Changer le mot de passe
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Mot de passe actuel"
                  name="currentPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={settings.currentPassword}
                  onChange={handleChange}
                  margin="normal"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleTogglePasswordVisibility}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Nouveau mot de passe"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={settings.newPassword}
                  onChange={handleChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Confirmer le mot de passe"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={settings.confirmPassword}
                  onChange={handleChange}
                  margin="normal"
                  error={settings.newPassword !== settings.confirmPassword && !!settings.confirmPassword}
                  helperText={settings.newPassword !== settings.confirmPassword && !!settings.confirmPassword ? 'Les mots de passe ne correspondent pas' : ''}
                />
              </Grid>
            </Grid>
          </TabPanel>

          {/* Onglet Notifications */}
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Paramètres de notification
            </Typography>
            <List>
              <ListItem>
                <ListItemText 
                  primary="Activer les notifications par email"
                  secondary="Recevoir des notifications importantes par email"
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    name="emailNotifications"
                    checked={settings.emailNotifications}
                    onChange={handleChange}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider variant="inset" component="li" />
              <ListItem>
                <ListItemText 
                  primary="Notifications push"
                  secondary="Activer les notifications en temps réel"
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    name="pushNotifications"
                    checked={settings.pushNotifications}
                    onChange={handleChange}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider variant="inset" component="li" />
              <ListItem>
                <ListItemText 
                  primary="Mises à jour de score"
                  secondary="Recevoir une notification pour chaque nouveau score"
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    name="scoreUpdates"
                    checked={settings.scoreUpdates}
                    onChange={handleChange}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider variant="inset" component="li" />
              <ListItem>
                <ListItemText 
                  primary="Rapports hebdomadaires"
                  secondary="Recevoir un résumé hebdomadaire par email"
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    name="weeklyReports"
                    checked={settings.weeklyReports}
                    onChange={handleChange}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </TabPanel>

          {/* Onglet Apparence */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              Personnalisation de l'interface
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Thème</InputLabel>
                  <Select
                    name="theme"
                    value={settings.theme}
                    onChange={handleChange}
                    label="Thème"
                  >
                    <MenuItem value="light">Clair</MenuItem>
                    <MenuItem value="dark">Sombre</MenuItem>
                    <MenuItem value="system">Système</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Langue</InputLabel>
                  <Select
                    name="language"
                    value={settings.language}
                    onChange={handleChange}
                    label="Langue"
                  >
                    <MenuItem value="fr">Français</MenuItem>
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="es">Español</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Typography id="font-size-slider" gutterBottom>
                  Taille de police
                </Typography>
                <TextField
                  fullWidth
                  type="range"
                  name="fontSize"
                  value={settings.fontSize}
                  onChange={handleChange}
                  min={12}
                  max={24}
                  step={1}
                />
                <Box display="flex" justifyContent="space-between" mt={1}>
                  <Typography variant="caption">Petit</Typography>
                  <Typography variant="caption">Grand</Typography>
                </Box>
                <Box mt={2} p={2} bgcolor="action.hover" borderRadius={1}>
                  <Typography style={{ fontSize: `${settings.fontSize}px` }}>
                    Exemple de texte avec la taille de police sélectionnée
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Onglet Sécurité */}
          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" gutterBottom>
              Paramètres de sécurité
            </Typography>
            <List>
              <ListItem>
                <ListItemText 
                  primary="Authentification à deux facteurs (2FA)"
                  secondary="Ajoutez une couche de sécurité supplémentaire à votre compte"
                />
                <ListItemSecondaryAction>
                  <Switch
                    edge="end"
                    name="twoFactorAuth"
                    checked={settings.twoFactorAuth}
                    onChange={handleChange}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider variant="inset" component="li" />
              <ListItem>
                <ListItemText 
                  primary="Déconnexion automatique"
                  secondary={`Déconnexion après ${settings.sessionTimeout} minutes d'inactivité`}
                />
                <Select
                  value={settings.sessionTimeout}
                  onChange={handleChange}
                  name="sessionTimeout"
                  size="small"
                  sx={{ minWidth: 100 }}
                >
                  <MenuItem value={15}>15 minutes</MenuItem>
                  <MenuItem value={30}>30 minutes</MenuItem>
                  <MenuItem value={60}>1 heure</MenuItem>
                  <MenuItem value={240}>4 heures</MenuItem>
                  <MenuItem value={0}>Jamais</MenuItem>
                </Select>
              </ListItem>
              <Divider variant="inset" component="li" />
              <ListItem>
                <ListItemText 
                  primary="Sessions actives"
                  secondary="Gérez les appareils connectés à votre compte"
                />
                <Button variant="outlined" size="small">
                  Voir les sessions
                </Button>
              </ListItem>
            </List>
          </TabPanel>

          {/* Onglet Intégrations */}
          <TabPanel value={tabValue} index={4}>
            <Typography variant="h6" gutterBottom>
              Intégrations tierces
            </Typography>
            <List>
              <ListItem>
                <Box sx={{ width: '100%' }}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <TelegramIcon sx={{ mr: 1, color: '#0088cc' }} />
                    <Typography variant="subtitle1">Bot Telegram</Typography>
                    <Switch
                      edge="end"
                      name="telegramBotEnabled"
                      checked={settings.telegramBotEnabled}
                      onChange={handleChange}
                      sx={{ ml: 'auto' }}
                    />
                  </Box>
                  {settings.telegramBotEnabled && (
                    <Box mt={2}>
                      {currentUser.telegramId ? (
                        <Box>
                          <Typography>Compte lié : @{currentUser.telegramUsername}</Typography>
                          <Button 
                            variant="outlined" 
                            color="error" 
                            size="small"
                            sx={{ mt: 1 }}
                            onClick={async () => {
                              try {
                                await unlinkTelegram();
                                notify('Compte Telegram délié', 'success');
                              } catch (e) {
                                notify('Erreur lors du déliage', 'error');
                              }
                            }}
                          >
                            Délier le compte
                          </Button>
                        </Box>
                      ) : (
                        <Box>
                          <TextField
                            fullWidth
                            label="Telegram ID"
                            name="telegramId"
                            value={settings.telegramId}
                            onChange={handleChange}
                            margin="normal"
                          />
                          <TextField
                            fullWidth
                            label="Telegram Username"
                            name="telegramUsername"
                            value={settings.telegramUsername}
                            onChange={handleChange}
                            margin="normal"
                          />
                          <TextField
                            fullWidth
                            label="ID de chat Telegram"
                            name="telegramChatId"
                            value={settings.telegramChatId}
                            onChange={handleChange}
                            margin="normal"
                            helperText="ID du chat où envoyer les notifications"
                          />
                          <Button 
                            variant="outlined" 
                            color="primary" 
                            size="small"
                            sx={{ mt: 1 }}
                            onClick={async () => {
                              try {
                                await linkTelegram(settings.telegramId, settings.telegramUsername, settings.telegramChatId);
                                notify('Compte Telegram lié', 'success');
                              } catch (e) {
                                notify('Erreur lors du liage', 'error');
                              }
                            }}
                          >
                            Lier le compte Telegram
                          </Button>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              </ListItem>
              <Divider variant="inset" component="li" />
              <ListItem>
                <Box sx={{ width: '100%' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Webhooks sortants
                  </Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    Configurez des webhooks pour envoyer des données à d'autres services
                  </Typography>
                  <Button variant="outlined" size="small">
                    Ajouter un webhook
                  </Button>
                </Box>
              </ListItem>
            </List>
          </TabPanel>

          {/* Onglet API */}
          <TabPanel value={tabValue} index={5}>
            <Typography variant="h6" gutterBottom>
              Paramètres de l'API
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Utilisez l'API pour intégrer vos données à d'autres applications. Consultez la documentation pour plus d'informations.
            </Alert>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Clé API"
                  name="apiKey"
                  value={settings.apiKey}
                  margin="normal"
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button 
                          variant="outlined" 
                          size="small" 
                          onClick={handleGenerateApiKey}
                        >
                          Régénérer
                        </Button>
                      </InputAdornment>
                    ),
                  }}
                  helperText="Gardez cette clé secrète et ne la partagez jamais"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Quota d'API
                  </Typography>
                  <Typography variant="h6" gutterBottom>
                    {settings.apiUsage} / {settings.apiQuota} requêtes
                  </Typography>
                  <Box sx={{ width: '100%', bgcolor: 'action.hover', borderRadius: 1, height: 8, mb: 1 }}>
                    <Box 
                      sx={{
                        width: `${(settings.apiUsage / settings.apiQuota) * 100}%`,
                        bgcolor: 'primary.main',
                        height: '100%',
                        borderRadius: 1
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    Réinitialisation le 1er du mois prochain
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Documentation de l'API
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Consultez notre documentation complète pour apprendre à utiliser l'API.
                  </Typography>
                  <Button 
                    variant="contained" 
                    size="small" 
                    color="primary"
                    target="_blank"
                    href="/api-docs"
                  >
                    Voir la documentation
                  </Button>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Boutons d'action */}
          <Box sx={{ p: 3, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <Button 
                type="button" 
                color="inherit" 
                onClick={handleResetForm}
                disabled={saving}
              >
                Réinitialiser
              </Button>
              <Button 
                type="button" 
                color="error" 
                sx={{ ml: 2 }}
                disabled={saving}
              >
                Annuler les modifications
              </Button>
            </div>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              disabled={saving}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default Settings;
