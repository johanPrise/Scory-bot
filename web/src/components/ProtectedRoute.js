import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * Composant pour protéger les routes qui nécessitent une authentification
 */
const ProtectedRoute = ({ children, requiredPermission, fallback }) => {
  const { isAuthenticated, loading, hasPermission, currentUser } = useAuth();
  const location = useLocation();

  // Afficher un loader pendant la vérification de l'authentification
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          gap: 2
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="textSecondary">
          Vérification de l'authentification...
        </Typography>
      </Box>
    );
  }

  // Rediriger vers la page de connexion si non authentifié
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Vérifier les permissions si requises
  if (requiredPermission && !hasPermission(requiredPermission)) {
    if (fallback) {
      return fallback;
    }
    
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error" gutterBottom>
          Accès non autorisé
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page.
        </Typography>
      </Box>
    );
  }

  // Afficher le contenu protégé
  return children;
};

/**
 * Hook pour vérifier l'authentification dans les composants
 */
export const useRequireAuth = (requiredPermission) => {
  const { isAuthenticated, hasPermission, currentUser } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return { 
      isAuthorized: false, 
      redirect: <Navigate to="/login" state={{ from: location }} replace /> 
    };
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return { 
      isAuthorized: false, 
      redirect: null,
      error: 'Permissions insuffisantes'
    };
  }

  return { 
    isAuthorized: true, 
    user: currentUser 
  };
};

/**
 * Composant pour les routes publiques (rediriger si déjà connecté)
 */
export const PublicRoute = ({ children, redirectTo = '/dashboard' }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

/**
 * Composant pour les routes basées sur les rôles
 */
export const RoleBasedRoute = ({ children, allowedRoles, currentUserRole, fallback }) => {
  if (!allowedRoles.includes(currentUserRole)) {
    if (fallback) {
      return fallback;
    }
    
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error" gutterBottom>
          Accès restreint
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Cette page est réservée aux utilisateurs avec le rôle : {allowedRoles.join(', ')}
        </Typography>
      </Box>
    );
  }

  return children;
};

export default ProtectedRoute;