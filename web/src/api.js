/**
 * Client API pour communiquer avec le backend Scory
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const ALLOWED_ORIGIN = new URL(API_BASE).origin;

// Valide que l'URL construite reste sur l'origine autorisée (CWE-918)
const buildUrl = (endpoint) => {
  const url = new URL(`${API_BASE}${endpoint}`);
  if (url.origin !== ALLOWED_ORIGIN) {
    throw new Error(`Origine non autorisée: ${url.origin}`);
  }
  return url.toString();
};

// Sanitise un chatId pour n'autoriser que des chiffres et le signe - (CWE-79)
const sanitizeChatId = (value) => {
  if (!value) return null;
  const clean = String(value).replaceAll(/[^0-9-]/g, '');
  return clean || null;
};

// ===== Sources de chatId =====
const getChatIdFromStorage = () =>
  sanitizeChatId(sessionStorage.getItem('scory_chatId') || localStorage.getItem('scory_selectedGroup'));

const getChatIdFromTelegram = () => {
  const id = globalThis.Telegram?.WebApp?.initDataUnsafe?.chat?.id;
  return id ? sanitizeChatId(id.toString()) : null;
};

const getChatIdFromUrl = () => {
  const params = new URLSearchParams(globalThis.location?.search || '');
  return sanitizeChatId(params.get('chatId') || params.get('chat_id'));
};

const getChatIdFromStartParam = () => {
  const startParam = globalThis.Telegram?.WebApp?.initDataUnsafe?.start_param;
  if (!startParam) return null;
  const parts = startParam.split('_');
  const chatIdx = parts.indexOf('chat');
  return chatIdx >= 0 ? sanitizeChatId(parts[chatIdx + 1]) : null;
};

/**
 * Récupère le chatId du contexte Telegram et le stocke en sessionStorage
 */
export const getChatId = () => {
  const stored = getChatIdFromStorage();
  if (stored) {
    sessionStorage.setItem('scory_chatId', stored);
    return stored;
  }

  const id = getChatIdFromTelegram()
    ?? getChatIdFromUrl()
    ?? getChatIdFromStartParam();

  if (id) sessionStorage.setItem('scory_chatId', id);
  return id;
};

/**
 * Récupère les headers d'authentification
 */
const getAuthHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('scory_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (globalThis.Telegram?.WebApp?.initData) {
    headers['X-Telegram-Init-Data'] = globalThis.Telegram.WebApp.initData;
  }
  return headers;
};

/**
 * Requête API générique
 */
const apiRequest = async (endpoint, options = {}) => {
  const url = buildUrl(endpoint);
  const response = await fetch(url, {
    ...options,
    headers: { ...getAuthHeaders(), ...options.headers },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Erreur réseau' }));
    throw new Error(err.error?.message || err.message || `Erreur ${response.status}`);
  }

  return response.json();
};

// ===== Helpers =====
const requireChatId = (context) => {
  const chatId = getChatId();
  const suffix = context ? ` pour ${context}` : '';
  if (!chatId) throw new Error(`Un groupe doit être sélectionné${suffix}`);
  return chatId;
};

const buildQuery = (params) => {
  const query = new URLSearchParams(params ?? undefined).toString();
  return query ? `?${query}` : '';
};

const withChatId = (params, context = undefined) => ({
  ...(params),
  chatId: requireChatId(context),
});

// ===== AUTH =====
export const getMe = () => apiRequest('/auth/me');

export const loginWithTelegram = async () => {
  const initData = globalThis.Telegram?.WebApp?.initData;
  if (!initData) throw new Error('Pas de données Telegram disponibles');
  const result = await apiRequest('/auth/telegram-login', {
    method: 'POST',
    body: JSON.stringify({ initData }),
  });
  if (result.token) localStorage.setItem('scory_token', result.token);
  return result;
};

// ===== ACTIVITIES =====
export const getActivities = (params = {}) => {
  params.chatId = requireChatId('accéder aux activités');
  return apiRequest(`/activities${buildQuery(params)}`);
};

export const createActivity = (data) => {
  const chatId = requireChatId('créer une activité');
  return apiRequest('/activities', { method: 'POST', body: JSON.stringify({ ...data, chatId }) });
};

export const getActivity = (id) => {
  const chatId = requireChatId();
  return apiRequest(`/activities/${id}${buildQuery({ chatId })}`);
};

// ===== SCORES =====
export const getScores = (params = {}) => {
  params.chatId = requireChatId('accéder aux scores');
  return apiRequest(`/scores${buildQuery(params)}`);
};

export const getRankings = (params = {}) => {
  params.chatId = requireChatId('accéder aux classements');
  return apiRequest(`/scores/rankings${buildQuery(params)}`);
};

export const getPersonalScores = (params = {}) => {
  params.chatId = requireChatId('accéder à vos scores');
  return apiRequest(`/scores/personal${buildQuery(params)}`);
};

export const addScore = (data) => {
  const chatId = requireChatId('ajouter un score');
  return apiRequest('/scores', {
    method: 'POST',
    body: JSON.stringify({ ...data, metadata: { ...(data.metadata), chatId } }),
  });
};

export const getPendingScores = (params) =>
  apiRequest('/scores/pending' + buildQuery(withChatId(params, 'accéder aux scores en attente')));

export const approveScore = (id, data) =>
  apiRequest(`/scores/${id}/approve${buildQuery(withChatId({}, 'approuver un score'))}`, {
    method: 'PUT',
    ...(data && { body: JSON.stringify(data) }),
  });

export const rejectScore = (id, data) =>
  apiRequest(`/scores/${id}/reject${buildQuery(withChatId({}, 'rejeter un score'))}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteScore = (id) =>
  apiRequest(`/scores/${id}${buildQuery(withChatId({}, 'supprimer un score'))}`, { method: 'DELETE' });

// ===== TEAMS =====
export const getTeams = (params = {}) => {
  params.chatId = requireChatId('accéder aux équipes');
  return apiRequest(`/teams${buildQuery(params)}`);
};

export const createTeam = (data) => {
  const chatId = requireChatId('créer une équipe');
  return apiRequest('/teams', { method: 'POST', body: JSON.stringify({ ...data, chatId }) });
};

export const getTeam = (id) => {
  const chatId = requireChatId();
  return apiRequest(`/teams/${id}${buildQuery({ chatId })}`);
};

export const getTeamMembers = (id) => {
  const chatId = requireChatId();
  return apiRequest(`/teams/${id}/members${buildQuery({ chatId })}`);
};

export const getTeamStats = (id) => {
  const chatId = requireChatId();
  return apiRequest(`/teams/${id}/stats${buildQuery({ chatId })}`);
};

export const joinTeam = (joinCode) =>
  apiRequest('/teams/join', {
    method: 'POST',
    body: JSON.stringify(withChatId({ joinCode }, 'rejoindre une équipe')),
  });

export const deleteTeam = (id) =>
  apiRequest(`/teams/${id}${buildQuery(withChatId({}, 'supprimer une équipe'))}`, { method: 'DELETE' });

// ===== DASHBOARD =====
export const getDashboard = (params = {}) => {
  params.chatId = requireChatId('accéder au dashboard');
  return apiRequest(`/dashboard${buildQuery(params)}`);
};

// ===== ACTIVITIES (extended) =====
export const getActivityHistory = (id, params = {}) => {
  params.chatId = requireChatId("accéder à l'historique");
  return apiRequest(`/activities/${id}/history${buildQuery(params)}`);
};

export const addSubActivity = (activityId, data) =>
  apiRequest(`/activities/${activityId}/subactivities`, {
    method: 'POST',
    body: JSON.stringify(withChatId(data, 'ajouter une sous-activité')),
  });

export const deleteActivity = (id) =>
  apiRequest(`/activities/${id}${buildQuery(withChatId({}, 'supprimer une activité'))}`, { method: 'DELETE' });

export const deleteSubActivity = (activityId, subId) =>
  apiRequest(
    `/activities/${activityId}/subactivities/${encodeURIComponent(subId)}${buildQuery(withChatId({}, 'supprimer une sous-activité'))}`,
    { method: 'DELETE' }
  );

// ===== USER =====
export const getUserProfile = () => apiRequest('/auth/me');
export const updateProfile = (data) =>
  apiRequest('/auth/profile', { method: 'PUT', body: JSON.stringify(data) });

// ===== GROUPS =====
export const getMyGroups = () => apiRequest('/groups');
export const getGroup = (chatId) => apiRequest(`/groups/${chatId}`);
