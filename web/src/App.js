import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Snackbar, Alert } from '@mui/material';
import {FloatingFeedback} from './components/FloatingFeedback';
import FloatingTimers from './components/FloatingTimers';
// Contexte d'authentification mis à jour
import { AuthProvider, useAuth } from './context/AuthContext';

// Composants de protection des routes
import ProtectedRoute, { PublicRoute, RoleBasedRoute } from './components/ProtectedRoute';

// Layout mis à jour
import Layout from './components/Layout';

// Pages principales
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Teams from './pages/Teams';
import Activities from './pages/Activities';
import Rankings from './pages/Rankings';
import Settings from './pages/Settings';

// Pages pour le rôle 'creator' (super-admin)
import CreatorDashboard from './pages/creator/Dashboard';
import CreatorGroups from './pages/creator/Groups';
import CreatorUsers from './pages/creator/Users';
import CreatorStats from './pages/creator/Stats';
import CreatorSettings from './pages/creator/Settings';

// Pages pour le rôle 'groupAdmin' (admin de groupe)
import GroupDashboard from './pages/group/Dashboard';
import GroupScores from './pages/group/Scores';
import GroupTeams from './pages/group/Teams';
import GroupSettings from './pages/group/Settings';

// Thème Material-UI amélioré
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
    },
    success: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
    },
    warning: {
      main: '#ed6c02',
      light: '#ff9800',
      dark: '#e65100',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          },
          transition: 'box-shadow 0.3s ease-in-out',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
        contained: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1a237e',
          color: 'white',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '4px 8px',
          '&.Mui-selected': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
        },
      },
    },
  },
});

// Composant pour gérer les notifications globales
function GlobalNotifications() {
  const { error, clearError } = useAuth();

  return (
    <Snackbar
      open={!!error}
      autoHideDuration={6000}
      onClose={clearError}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert onClose={clearError} severity="error" sx={{ width: '100%' }}>
        {error}
      </Alert>
    </Snackbar>
  );
}

// Composant pour rediriger selon le rôle
function RoleBasedRedirect() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Redirection selon le rôle
  switch (currentUser.role) {
    case 'admin':
    case 'superadmin':
      return <Navigate to="/creator/dashboard" replace />;
    case 'groupAdmin':
      return <Navigate to="/group/dashboard" replace />;
    default:
      return <Navigate to="/dashboard" replace />;
  }
}

// Composant principal de l'application
function AppContent() {
  const { currentUser } = useAuth();

  return (
    <>
      <GlobalNotifications />
      <Routes>
        {/* Routes publiques */}
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />

        {/* Route de redirection par défaut */}
        <Route path="/" element={<RoleBasedRedirect />} />

        {/* Routes pour utilisateurs normaux */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout role="user">
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/teams" element={
          <ProtectedRoute>
            <Layout role="user">
              <Teams />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/activities" element={
          <ProtectedRoute>
            <Layout role="user">
              <Activities />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/rankings" element={
          <ProtectedRoute>
            <Layout role="user">
              <Rankings />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute>
            <Layout role="user">
              <Settings />
            </Layout>
          </ProtectedRoute>
        } />

        {/* Routes pour le rôle 'creator' (super-admin) */}
        <Route path="/creator/*" element={
          <ProtectedRoute requiredPermission="manage_users">
            <Layout role="creator" />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<CreatorDashboard />} />
          <Route path="groups" element={<CreatorGroups />} />
          <Route path="users" element={<CreatorUsers />} />
          <Route path="stats" element={<CreatorStats />} />
          <Route path="settings" element={<CreatorSettings />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Routes pour le rôle 'groupAdmin' (admin de groupe) */}
        <Route path="/group/*" element={
          <RoleBasedRoute 
            allowedRoles={['groupAdmin']} 
            currentUserRole={currentUser?.role}
          >
            <Layout role="groupAdmin" />
          </RoleBasedRoute>
        }>
          <Route path="dashboard" element={<GroupDashboard />} />
          <Route path="scores" element={<GroupScores />} />
          <Route path="teams" element={<GroupTeams />} />
          <Route path="settings" element={<GroupSettings />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Route 404 */}
        <Route path="*" element={
          <ProtectedRoute>
            <Layout role={currentUser?.role || 'user'}>
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2>Page non trouvée</h2>
                <p>La page que vous cherchez n'existe pas.</p>
              </div>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </>
  );
}

// Composant racine de l'application
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <AppContent />
          {/* Bouton flottant pour minuteurs, accessible partout */}
          <FloatingTimers />
          <FloatingFeedback />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;