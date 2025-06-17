import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../api.js';

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
      const userData = await auth.getCurrentUser();
      
      setCurrentUser({
        ...userData.user,
        token,
        isAuthenticated: true
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

      const response = await auth.login(loginData, password);
      
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

  // Fonction d'inscription
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await auth.register(userData);
      
      const newUser = {
        ...response.user,
        token: response.token,
        isAuthenticated: true
      };

      setCurrentUser(newUser);
      
      localStorage.setItem('token', response.token);
      
      return newUser;
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
      setError(error.message || 'Erreur d\'inscription');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Fonction de déconnexion
  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setError(null);
    
    // Rediriger vers la page de connexion
    window.location.href = '/login';
  };

  // Mettre à jour le profil utilisateur
  const updateProfile = async (profileData) => {
    try {
      setError(null);
      
      const response = await auth.updateProfile(profileData);
      
      setCurrentUser(prev => ({
        ...prev,
        ...response.user
      }));
      
      return response.user;
    } catch (error) {
      console.error('Erreur de mise à jour du profil:', error);
      setError(error.message || 'Erreur de mise à jour du profil');
      throw error;
    }
  };

  // Changer le mot de passe
  const changePassword = async (currentPassword, newPassword) => {
    try {
      setError(null);
      
      await auth.changePassword(currentPassword, newPassword);
      
      return true;
    } catch (error) {
      console.error('Erreur de changement de mot de passe:', error);
      setError(error.message || 'Erreur de changement de mot de passe');
      throw error;
    }
  };

  // Lier un compte Telegram
  const linkTelegram = async (telegramData) => {
    try {
      setError(null);
      
      const response = await auth.linkTelegram(telegramData);
      
      setCurrentUser(prev => ({
        ...prev,
        telegram: response.telegram
      }));
      
      return response.telegram;
    } catch (error) {
      console.error('Erreur de liaison Telegram:', error);
      setError(error.message || 'Erreur de liaison Telegram');
      throw error;
    }
  };

  // Délier le compte Telegram
  const unlinkTelegram = async () => {
    try {
      setError(null);
      
      await auth.unlinkTelegram();
      
      setCurrentUser(prev => ({
        ...prev,
        telegram: { id: undefined, username: undefined, chatId: undefined }
      }));
      
      return true;
    } catch (error) {
      console.error('Erreur de déliaison Telegram:', error);
      setError(error.message || 'Erreur de déliaison Telegram');
      throw error;
    }
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

  const value = {
    // État
    currentUser,
    loading,
    error,
    isAuthenticated: !!currentUser?.isAuthenticated,
    
    // Actions d'authentification
    login,
    register,
    logout,
    checkAuthStatus,
    
    // Actions de profil
    updateProfile,
    changePassword,
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