/**
 * Client API pour communiquer avec le backend Scory
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Récupère le token d'auth depuis l'initData Telegram ou le localStorage
 */
const getAuthHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  
  // Token JWT si disponible (prioritaire)
  const token = localStorage.getItem('scory_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // En mode Telegram, on envoie aussi le initData comme fallback
  if (globalThis.Telegram?.WebApp?.initData) {
    headers['X-Telegram-Init-Data'] = globalThis.Telegram.WebApp.initData;
  }
  
  return headers;
};

/**
 * Requête API générique
 */
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erreur réseau' }));
      throw new Error(error.error?.message || error.message || `Erreur ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
};

// ===== AUTH =====
export const getMe = () => apiRequest('/auth/me');

export const loginWithTelegram = async () => {
  const initData = globalThis.Telegram?.WebApp?.initData;
  if (!initData) {
    throw new Error('Pas de données Telegram disponibles');
  }
  const result = await apiRequest('/auth/telegram-login', {
    method: 'POST',
    body: JSON.stringify({ initData }),
  });
  // Sauvegarder le token JWT
  if (result.token) {
    localStorage.setItem('scory_token', result.token);
  }
  return result;
};

// ===== ACTIVITIES =====
export const getActivities = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/activities${query ? '?' + query : ''}`);
};

export const createActivity = (data) =>
  apiRequest('/activities', { method: 'POST', body: JSON.stringify(data) });

export const getActivity = (id) => apiRequest(`/activities/${id}`);

// ===== SCORES =====
export const getScores = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/scores${query ? '?' + query : ''}`);
};

export const getRankings = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/scores/rankings${query ? '?' + query : ''}`);
};

export const getPersonalScores = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/scores/personal${query ? '?' + query : ''}`);
};

export const addScore = (data) =>
  apiRequest('/scores', { method: 'POST', body: JSON.stringify(data) });

// ===== TEAMS =====
export const getTeams = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/teams${query ? '?' + query : ''}`);
};

export const createTeam = (data) =>
  apiRequest('/teams', { method: 'POST', body: JSON.stringify(data) });

export const getTeam = (id) => apiRequest(`/teams/${id}`);

export const getTeamMembers = (id) => apiRequest(`/teams/${id}/members`);

export const getTeamStats = (id) => apiRequest(`/teams/${id}/stats`);

export const joinTeam = (joinCode) =>
  apiRequest('/teams/join', { method: 'POST', body: JSON.stringify({ joinCode }) });

// ===== DASHBOARD =====
export const getDashboard = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/dashboard${query ? '?' + query : ''}`);
};

// ===== SCORES (extended) =====
export const getPendingScores = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/scores/pending${query ? '?' + query : ''}`);
};

export const approveScore = (id, data = {}) =>
  apiRequest(`/scores/${id}/approve`, { method: 'PUT', body: JSON.stringify(data) });

export const rejectScore = (id, data) =>
  apiRequest(`/scores/${id}/reject`, { method: 'PUT', body: JSON.stringify(data) });

// ===== ACTIVITIES (extended) =====
export const getActivityHistory = (id, params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/activities/${id}/history${query ? '?' + query : ''}`);
};

export const addSubActivity = (activityId, data) =>
  apiRequest(`/activities/${activityId}/subactivities`, { method: 'POST', body: JSON.stringify(data) });

// ===== USER =====
export const getUserProfile = () => apiRequest('/auth/me');
export const updateProfile = (data) =>
  apiRequest('/auth/profile', { method: 'PUT', body: JSON.stringify(data) });
