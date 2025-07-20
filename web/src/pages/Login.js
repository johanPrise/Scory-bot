import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
  Link
} from '@mui/material';
import { 
  LockOutlined, 
  Login as LoginIcon, 
  PersonAdd as RegisterIcon,
  Telegram as TelegramIcon 
} from '@mui/icons-material';

const Login = () => {
  const [tab, setTab] = useState(0); // 0 = Login, 1 = Register
  const [formData, setFormData] = useState({
    // Login
    login: '',
    password: '',
    // Register
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    registerPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  const { login, register, telegramLogin, error, clearError, isAuthenticated } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  // Rediriger si déjà connecté
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Effacer les erreurs quand on change d'onglet
  useEffect(() => {
    setLocalError(null);
    clearError();
  }, [tab, clearError]);

  const handleInputChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    
    // Effacer les erreurs lors de la saisie
    if (localError || error) {
      setLocalError(null);
      clearError();
    }
  };

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
    setFormData({
      login: '',
      password: '',
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      registerPassword: '',
      confirmPassword: ''
    });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.login || !formData.password) {
      setLocalError('Veuillez remplir tous les champs');
      notify('Veuillez remplir tous les champs', 'warning');
      return;
    }

    setLoading(true);
    setLocalError(null);

    try {
      await login(formData.login, formData.password);
      notify('Connexion réussie', 'success');
      // La redirection se fera automatiquement via useEffect
    } catch (err) {
      setLocalError(err.message || 'Erreur lors de la connexion');
      notify(err.message || 'Erreur lors de la connexion', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.username || !formData.email || !formData.registerPassword) {
      setLocalError('Veuillez remplir tous les champs obligatoires');
      notify('Veuillez remplir tous les champs obligatoires', 'warning');
      return;
    }

    if (formData.registerPassword !== formData.confirmPassword) {
      setLocalError('Les mots de passe ne correspondent pas');
      notify('Les mots de passe ne correspondent pas', 'warning');
      return;
    }

    if (formData.registerPassword.length < 8) {
      setLocalError('Le mot de passe doit contenir au moins 8 caractères');
      notify('Le mot de passe doit contenir au moins 8 caractères', 'warning');
      return;
    }

    setLoading(true);
    setLocalError(null);

    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.registerPassword,
        firstName: formData.firstName,
        lastName: formData.lastName
      });
      notify('Inscription réussie', 'success');
      // La redirection se fera automatiquement via useEffect
    } catch (err) {
      setLocalError(err.message || 'Erreur lors de l\'inscription');
      notify(err.message || 'Erreur lors de l\'inscription', 'error');
    } finally {
      setLoading(false);
    }
  };

  const currentError = localError || error;

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: 'background.default',
        p: 2
      }}
    >
      <Paper elevation={6} sx={{ p: 4, width: '100%', maxWidth: 450, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <LockOutlined fontSize="large" color="primary" sx={{ mb: 1 }} />
          <Typography component="h1" variant="h4" gutterBottom>
            Scory Bot
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Interface de gestion des scores et équipes
          </Typography>
        </Box>

        <Tabs value={tab} onChange={handleTabChange} centered sx={{ mb: 3 }}>
          <Tab label="Connexion" />
          <Tab label="Inscription" />
        </Tabs>

        {currentError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {currentError}
          </Alert>
        )}

        {/* Onglet Connexion */}
        {tab === 0 && (
          <form onSubmit={handleLoginSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email ou nom d'utilisateur"
              name="login"
              autoComplete="username"
              autoFocus
              value={formData.login}
              onChange={handleInputChange('login')}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Mot de passe"
              type="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleInputChange('password')}
              disabled={loading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        )}

        {/* Onglet Inscription */}
        {tab === 1 && (
          <form onSubmit={handleRegisterSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Nom d'utilisateur"
              name="username"
              autoComplete="username"
              autoFocus
              value={formData.username}
              onChange={handleInputChange('username')}
              disabled={loading}
              helperText="3-30 caractères, lettres, chiffres, tirets et underscores uniquement"
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              disabled={loading}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                margin="normal"
                fullWidth
                label="Prénom"
                name="firstName"
                autoComplete="given-name"
                value={formData.firstName}
                onChange={handleInputChange('firstName')}
                disabled={loading}
              />
              <TextField
                margin="normal"
                fullWidth
                label="Nom"
                name="lastName"
                autoComplete="family-name"
                value={formData.lastName}
                onChange={handleInputChange('lastName')}
                disabled={loading}
              />
            </Box>
            <TextField
              margin="normal"
              required
              fullWidth
              name="registerPassword"
              label="Mot de passe"
              type="password"
              autoComplete="new-password"
              value={formData.registerPassword}
              onChange={handleInputChange('registerPassword')}
              disabled={loading}
              helperText="Au moins 8 caractères"
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirmer le mot de passe"
              type="password"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              disabled={loading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              startIcon={loading ? <CircularProgress size={20} /> : <RegisterIcon />}
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Inscription...' : 'S\'inscrire'}
            </Button>
          </form>
        )}

        <Divider sx={{ my: 3 }}>
          <Typography variant="body2" color="text.secondary">
            ou
          </Typography>
        </Divider>

        <Button
          fullWidth
          variant="outlined"
          startIcon={<TelegramIcon />}
          sx={{ mb: 2 }}
          disabled={loading}
          onClick={async () => {
            try {
              const initData = window.Telegram?.WebApp?.initData;
              if (!initData) {
                setLocalError('Disponible uniquement dans l\'app Telegram');
                return;
              }
              setLoading(true);
              await telegramLogin(initData);
              notify('Connexion Telegram réussie', 'success');
            } catch (err) {
              setLocalError(err.message || 'Erreur de connexion Telegram');
            } finally {
              setLoading(false);
            }
          }}
        >
          Continuer avec Telegram
        </Button>

        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3 }}>
          En vous connectant, vous acceptez nos{' '}
          <Link href="#" underline="hover">
            conditions d'utilisation
          </Link>
          {' '}et notre{' '}
          <Link href="#" underline="hover">
            politique de confidentialité
          </Link>
          .
        </Typography>
      </Paper>
    </Box>
  );
};

export default Login;