import axios from 'axios';
import dotenv from 'dotenv';
import logger from '../utils/logger';

// Charger les variables d'environnement
dotenv.config();

// Configuration de base de l'API
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT || '15000', 10);

/**
 * Crée une instance axios configurée avec les paramètres de base
 * @type {import('axios').AxiosInstance}
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: API_TIMEOUT,
  withCredentials: true,
  validateStatus: (status) => status >= 200 && status < 500,
});

// Intercepteur pour ajouter le token d'authentification et gérer les requêtes
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Ajouter un timestamp pour éviter le cache
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }
    
    return config;
  },
  (error) => {
    logger.error('Erreur de configuration de la requête:', error);
    return Promise.reject(handleApiError(error));
  }
);

// Intercepteur de réponse pour la gestion centralisée des erreurs
apiClient.interceptors.response.use(
  (response) => {
    // Si la réponse contient une erreur (status >= 400), la traiter comme une erreur
    if (response.status >= 400) {
      return Promise.reject({
        response,
        message: response.data?.message || 'Erreur inconnue',
      });
    }
    return response;
  },
  (error) => {
    // Gestion des erreurs réseau
    if (error.code === 'ECONNABORTED') {
      return Promise.reject({
        message: 'La requête a expiré',
        code: 'TIMEOUT_ERROR',
      });
    }
    
    if (!error.response) {
      return Promise.reject({
        message: 'Erreur de connexion au serveur',
        code: 'NETWORK_ERROR',
      });
    }
    
    return Promise.reject(error);
  }
);

/**
 * Gestion centralisée des erreurs API
 * @param {Error} error - L'erreur à traiter
 * @returns {Error} L'erreur formatée
 */
const handleApiError = (error) => {
  if (error.response) {
    // La requête a été faite et le serveur a répondu avec un statut d'erreur
    const { status, data } = error.response;
    
    // Journalisation détaillée
    logger.error(`Erreur API [${status}]:`, {
      message: data?.message || error.message,
      url: error.config?.url,
      method: error.config?.method,
      status,
      code: data?.code,
    });
    
    // Gestion des erreurs courantes
    switch (status) {
      case 400:
        return new Error(data.message || 'Requête invalide');
      case 401:
        // Déconnexion si non autorisé
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return new Error('Session expirée. Veuillez vous reconnecter.');
      case 403:
        return new Error('Accès non autorisé');
      case 404:
        return new Error('Ressource non trouvée');
      case 409:
        return new Error(data.message || 'Conflit de données');
      case 422:
        return new Error('Erreur de validation: ' + (data.errors || 'Données invalides'));
      case 429:
        return new Error('Trop de requêtes. Veuillez patienter avant de réessayer.');
      case 500:
        return new Error('Erreur interne du serveur');
      default:
        return new Error(data?.message || 'Une erreur est survenue');
    }
  } else if (error.request) {
    // La requête a été faite mais aucune réponse n'a été reçue
    logger.error('Aucune réponse du serveur:', error.request);
    return new Error('Pas de réponse du serveur. Vérifiez votre connexion.');
  } else {
    // Une erreur s'est produite lors de la configuration de la requête
    logger.error('Erreur de configuration de la requête:', error);
    return new Error('Erreur lors de la configuration de la requête');
  }
};

/**
 * Service pour gérer les appels API liés à l'authentification et aux utilisateurs
 */
export const authService = {
  /**
   * Lier un compte Telegram à un compte utilisateur existant
   * @param {string} telegramId - L'ID Telegram de l'utilisateur
   * @param {string} linkCode - Le code de liaison généré côté web
   * @returns {Promise<Object>} Les données de l'utilisateur mis à jour
   */
  async linkTelegramAccount(telegramId, linkCode) {
    const response = await apiClient.post('/auth/link-telegram', {
      telegramId,
      linkCode,
    });
    return response.data;
  },

  /**
   * Obtenir les informations d'un utilisateur par son ID Telegram
   * @param {string} telegramId - L'ID Telegram de l'utilisateur
   * @returns {Promise<Object>} Les données de l'utilisateur
   */
  async getUserByTelegramId(telegramId) {
    const response = await apiClient.get(`/users/telegram/${telegramId}`);
    return response.data;
  },

  /**
   * Se connecter avec email/mot de passe
   * @param {string} email - Email de l'utilisateur
   * @param {string} password - Mot de passe
   * @returns {Promise<{user: Object, token: string}>} Données utilisateur et token JWT
   */
  async login(email, password) {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  /**
   * Rafraîchir le token d'authentification
   * @returns {Promise<{token: string}>} Le nouveau token JWT
   */
  async refreshToken() {
    const response = await apiClient.post('/auth/refresh-token');
    return response.data;
  },

  /**
   * Récupérer le profil de l'utilisateur connecté
   * @returns {Promise<Object>} Les données de l'utilisateur
   */
  async getCurrentUser() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  /**
   * Déconnexion de l'utilisateur
   * @returns {Promise<void>}
   */
  async logout() {
    await apiClient.post('/auth/logout');
  },
};

/**
 * Service pour gérer les appels API liés aux activités
 */
export const activityService = {
  /**
   * Récupérer les activités d'un utilisateur
   * @param {string} userId - L'ID de l'utilisateur
   * @param {Object} [params] - Paramètres de filtrage
   * @param {string} [params.status] - Filtrer par statut (active, inactive)
   * @returns {Promise<Array>} La liste des activités
   */
  async getUserActivities(userId, params = {}) {
    const response = await apiClient.get(`/users/${userId}/activities`, { params });
    return response.data;
  },

  /**
   * Créer une nouvelle activité
   * @param {Object} activityData - Les données de l'activité à créer
   * @param {string} activityData.name - Nom de l'activité
   * @param {string} [activityData.description] - Description de l'activité
   * @param {number} [activityData.points] - Points par défaut
   * @returns {Promise<Object>} L'activité créée
   */
  async createActivity(activityData) {
    const response = await apiClient.post('/activities', activityData);
    return response.data;
  },

  /**
   * Mettre à jour une activité existante
   * @param {string} activityId - L'ID de l'activité à mettre à jour
   * @param {Object} updates - Les mises à jour à appliquer
   * @returns {Promise<Object>} L'activité mise à jour
   */
  async updateActivity(activityId, updates) {
    const response = await apiClient.patch(`/activities/${activityId}`, updates);
    return response.data;
  },

  /**
   * Supprimer une activité
   * @param {string} activityId - L'ID de l'activité à supprimer
   * @returns {Promise<void>}
   */
  async deleteActivity(activityId) {
    await apiClient.delete(`/activities/${activityId}`);
  },

  /**
   * Ajouter une sous-activité
   * @param {string} parentId - ID de l'activité parente
   * @param {Object} subActivityData - Données de la sous-activité
   * @returns {Promise<Object>} La sous-activité créée
   */
  async addSubActivity(parentId, subActivityData) {
    const response = await apiClient.post(
      `/activities/${parentId}/sub-activities`,
      subActivityData
    );
    return response.data;
  },
};

/**
 * Service pour gérer les appels API liés aux équipes
 */
export const teamService = {
  /**
   * Créer une nouvelle équipe
   * @param {Object} teamData - Données de l'équipe
   * @param {string} teamData.name - Nom de l'équipe
   * @param {string} [teamData.description] - Description de l'équipe
   * @param {string} [teamData.chatId] - ID du chat associé
   * @returns {Promise<Object>} L'équipe créée
   */
  async createTeam(teamData) {
    const response = await apiClient.post('/teams', teamData);
    return response.data;
  },

  /**
   * Récupérer les équipes d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<Array>} Liste des équipes
   */
  async getUserTeams(userId) {
    const response = await apiClient.get(`/users/${userId}/teams`);
    return response.data;
  },

  /**
   * Récupérer les membres d'une équipe
   * @param {string} teamId - ID de l'équipe
   * @returns {Promise<Array>} Liste des membres
   */
  async getTeamMembers(teamId) {
    const response = await apiClient.get(`/teams/${teamId}/members`);
    return response.data;
  },

  /**
   * Ajouter un membre à une équipe
   * @param {string} teamId - ID de l'équipe
   * @param {Object} memberData - Données du membre
   * @param {string} memberData.userId - ID de l'utilisateur à ajouter
   * @param {string} [memberData.role] - Rôle dans l'équipe
   * @returns {Promise<Object>} Membre ajouté
   */
  async addTeamMember(teamId, memberData) {
    const response = await apiClient.post(
      `/teams/${teamId}/members`,
      memberData
    );
    return response.data;
  },
};

/**
 * Service pour gérer les appels API liés aux scores
 */
export const scoreService = {
  /**
   * Enregistrer un nouveau score
   * @param {Object} scoreData - Données du score
   * @param {string} scoreData.activityId - ID de l'activité
   * @param {string} scoreData.userId - ID de l'utilisateur
   * @param {number} scoreData.value - Valeur du score
   * @param {string} [scoreData.notes] - Notes supplémentaires
   * @returns {Promise<Object>} Le score enregistré
   */
  async addScore(scoreData) {
    const response = await apiClient.post('/scores', scoreData);
    return response.data;
  },

  /**
   * Récupérer l'historique des scores
   * @param {Object} [params] - Paramètres de filtrage
   * @param {string} [params.userId] - Filtrer par utilisateur
   * @param {string} [params.activityId] - Filtrer par activité
   * @param {string} [params.teamId] - Filtrer par équipe
   * @param {string} [params.startDate] - Date de début (ISO)
   * @param {string} [params.endDate] - Date de fin (ISO)
   * @param {number} [params.limit=50] - Nombre de résultats
   * @param {number} [params.offset=0] - Décalage de pagination
   * @returns {Promise<{items: Array, total: number}>} Liste des scores et total
   */
  async getScores(params = {}) {
    const response = await apiClient.get('/scores', { params });
    return response.data;
  },

  /**
   * Obtenir le classement
   * @param {Object} [params] - Paramètres de classement
   * @param {string} [params.period] - Période (day, week, month, year)
   * @param {string} [params.activityId] - Filtrer par activité
   * @param {string} [params.teamId] - Filtrer par équipe
   * @returns {Promise<Array>} Classement
   */
  async getRanking(params = {}) {
    const response = await apiClient.get('/scores/ranking', { params });
    return response.data;
  },
};

/**
 * Fonction utilitaire pour effectuer des appels API génériques
 * @param {string} url - L'URL de l'endpoint (sans le baseURL)
 * @param {Object} [options] - Les options de la requête
 * @param {string} [options.method='GET'] - Méthode HTTP
 * @param {Object} [options.body] - Corps de la requête
 * @param {Object} [options.params] - Paramètres de requête
 * @param {Object} [options.headers] - En-têtes personnalisés
 * @returns {Promise<{data: any}>} La réponse de l'API
 */
export const fetchAPI = async (url, options = {}) => {
  const response = await apiClient({
    url,
    method: options.method || 'GET',
    data: options.body,
    params: options.params,
    headers: options.headers,
    ...options,
  });
  return { data: response.data };
};

// Exporter l'instance axios pour une utilisation directe si nécessaire
export default apiClient;
