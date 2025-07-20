import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser as apiLogin, getCurrentUser, registerUser, telegramLogin, changePassword, linkTelegramAccount, unlinkTelegramAccount, updateUserSettings } from '../api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Vérifier si un utilisateur est déjà connecté au chargement
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        return;
      }

      // Vérifier la validité du token en récupérant le profil utilisateur
      const userData = await getCurrentUser();
      
      setCurrentUser({
        ...userData.user,
        token,
        isAuthenticated: true,
        userId: userData.user?._id || userData.user?.id // Ajout explicite de userId
      });
      
      setError(null);
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'authentification:', error);
      
      // Token invalide ou expiré
      localStorage.removeItem('token');
      setCurrentUser(null);
      setError('Session expirée, veuillez vous reconnecter');
    } finally {
      setLoading(false);
    }
  };

  // Fonction de connexion
  const login = async (loginData, password) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiLogin(loginData, password);
      
      const userData = {
        ...response.user,
        token: response.token,
        isAuthenticated: true
      };

      setCurrentUser(userData);
      
      // Stocker des informations de base dans localStorage pour la persistance
      localStorage.setItem('token', response.token);
      
      return userData;
    } catch (error) {
      console.error('Erreur de connexion:', error);
      setError(error.message || 'Erreur de connexion');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Fonctions implémentées
  const register = async (username, email, password, firstName, lastName) => {
    const response = await registerUser(username, email, password, firstName, lastName);
    const userData = {
      ...response.user,
      token: response.token,
      isAuthenticated: true
    };
    setCurrentUser(userData);
    localStorage.setItem('token', response.token);
    return userData;
  };
  const updateProfile = async (settings) => {
    await updateUserSettings(settings);
    await checkAuthStatus();
  };
  const changePasswordLocal = async (currentPassword, newPassword) => {
    await changePassword(currentPassword, newPassword);
  };
  const linkTelegram = async (telegramId, telegramUsername, chatId) => {
    await linkTelegramAccount(telegramId, telegramUsername, chatId);
    await checkAuthStatus();
  };
  const unlinkTelegram = async () => {
    await unlinkTelegramAccount();
    await checkAuthStatus();
  };
  const telegramLoginLocal = async (initData) => {
    const response = await telegramLogin(initData);
    const userData = {
      ...response.user,
      token: response.token,
      isAuthenticated: true
    };
    setCurrentUser(userData);
    localStorage.setItem('token', response.token);
    return userData;
  };

  // Vérifier les permissions
  const hasPermission = (permission) => {
    if (!currentUser) return false;
    
    // Admins ont toutes les permissions
    if (['admin', 'superadmin'].includes(currentUser.role)) {
      return true;
    }
    
    // Logique de permissions spécifiques selon les besoins
    switch (permission) {
      case 'manage_users':
        return ['admin', 'superadmin'].includes(currentUser.role);
      case 'manage_teams':
        return ['admin', 'superadmin'].includes(currentUser.role);
      case 'view_dashboard':
        return true; // Tous les utilisateurs connectés
      default:
        return false;
    }
  };

  // Vérifier si l'utilisateur est dans une équipe spécifique
  const isInTeam = (teamId) => {
    if (!currentUser || !currentUser.teams) return false;
    
    return currentUser.teams.some(team => 
      team.team._id === teamId || team.team === teamId
    );
  };

  // Vérifier si l'utilisateur est admin d'une équipe
  const isTeamAdmin = (teamId) => {
    if (!currentUser || !currentUser.teams) return false;
    
    const teamMembership = currentUser.teams.find(team => 
      team.team._id === teamId || team.team === teamId
    );
    
    return teamMembership && ['admin', 'owner'].includes(teamMembership.role);
  };

  // Effacer les erreurs
  const clearError = () => setError(null);

  // Fonction de déconnexion
  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setError(null);
    // Rediriger vers la page de connexion
    window.location.href = '/login';
  };

  const value = {
    // État
    currentUser,
    loading,
    error,
    isAuthenticated: !!currentUser?.isAuthenticated,
    
    // Actions d'authentification
    login,
    telegramLogin: telegramLoginLocal,
    register,
    logout,
    checkAuthStatus,
    
    // Actions de profil
    updateProfile,
    changePassword: changePasswordLocal,
    linkTelegram,
    unlinkTelegram,
    
    // Utilitaires
    hasPermission,
    isInTeam,
    isTeamAdmin,
    clearError,
    
    // Informations utilisateur rapides
    userId: currentUser?.id,
    username: currentUser?.username,
    role: currentUser?.role,
    teams: currentUser?.teams || [],
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};