/**
 * Client API pour communiquer avec le backend Scory
 */

const normalizeApiBase = value => {
  let base = value;
  while (base.endsWith('/')) base = base.slice(0, -1);
  return base.endsWith('/api') ? base : `${base}/api`;
};

const RAW_API_V2_URL = import.meta.env.VITE_API_V2_URL;
const API_V2_ENABLED = import.meta.env.VITE_API_V2_ENABLED !== 'false' && Boolean(RAW_API_V2_URL);
const API_V2_BASE = normalizeApiBase(RAW_API_V2_URL || 'http://localhost:3101/api');
const API_BASE = normalizeApiBase(
  API_V2_ENABLED ? RAW_API_V2_URL : import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
);
const API_V2_CHAT_IDS_RAW = import.meta.env.VITE_API_V2_CHAT_IDS || '';
const DEV_USER_ID = import.meta.env.VITE_SCORY_DEV_USER_ID;
const ALLOWED_ORIGIN = new URL(API_BASE).origin;
const ALLOWED_V2_ORIGIN = new URL(API_V2_BASE).origin;
const DEFAULT_GET_CACHE_TTL = 15_000;
const DEFAULT_REQUEST_TIMEOUT = 20_000;

const responseCache = new Map();
const inFlightRequests = new Map();

// Valide que l'URL construite reste sur l'origine autorisée (CWE-918)
const buildUrl = (endpoint, base = API_BASE, allowedOrigin = ALLOWED_ORIGIN) => {
  const url = new URL(`${base}${endpoint}`);
  if (url.origin !== allowedOrigin) {
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

const API_V2_CHAT_IDS = API_V2_CHAT_IDS_RAW
  .split(',')
  .map(value => sanitizeChatId(value.trim()))
  .filter(Boolean);

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
  if (DEV_USER_ID) headers['X-Scory-User-Id'] = DEV_USER_ID;
  if (globalThis.Telegram?.WebApp?.initData) {
    headers['X-Telegram-Init-Data'] = globalThis.Telegram.WebApp.initData;
  }
  return headers;
};

/**
 * Requête API générique
 */
const apiRequest = async (endpoint, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const {
    base = API_BASE,
    allowedOrigin = ALLOWED_ORIGIN,
    cache = method === 'GET',
    cacheTtl = DEFAULT_GET_CACHE_TTL,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT,
    ...fetchOptions
  } = options;
  const url = buildUrl(endpoint, base, allowedOrigin);
  const requestKey = `${method}:${url}`;

  if (cache) {
    const cached = responseCache.get(requestKey);
    if (cached && Date.now() - cached.createdAt < cacheTtl) return cached.data;

    const inFlight = inFlightRequests.get(requestKey);
    if (inFlight) return inFlight;
  }

  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  const request = fetch(url, {
    ...fetchOptions,
    signal: fetchOptions.signal || controller.signal,
    headers: { ...getAuthHeaders(), ...fetchOptions.headers },
  })
    .then(async (response) => {
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Erreur réseau' }));
        throw new Error(err.error?.message || err.message || `Erreur ${response.status}`);
      }

      const data = await response.json();
      if (cache) responseCache.set(requestKey, { data, createdAt: Date.now() });
      if (method !== 'GET') responseCache.clear();
      return data;
    })
    .catch((error) => {
      if (error.name === 'AbortError') {
        throw new Error('La requête a expiré. Réessayez dans quelques instants.');
      }
      throw error;
    })
    .finally(() => {
      globalThis.clearTimeout(timeout);
      inFlightRequests.delete(requestKey);
    });

  if (cache) inFlightRequests.set(requestKey, request);
  return request;
};

const apiV2Request = (endpoint, options = {}) =>
  apiRequest(endpoint, { ...options, base: API_V2_BASE, allowedOrigin: ALLOWED_V2_ORIGIN });

const omitParams = (params, names) => Object.fromEntries(
  Object.entries(params).filter(([name]) => !names.includes(name))
);

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

const isApiV2EnabledForChat = (chatId = getChatId()) => {
  const forced = localStorage.getItem('scory_api_v2');
  if (forced === 'true') return true;
  if (forced === 'false') return false;
  if (!API_V2_ENABLED) return false;
  return API_V2_CHAT_IDS.length === 0 || API_V2_CHAT_IDS.includes(sanitizeChatId(chatId));
};

const normalizeV2Score = score => ({
  ...score,
  _id: score.id,
  activity: score.activity,
  user: score.user,
  team: score.team,
});

const normalizeV2Ranking = (item, scope = 'individual') => ({
  ...item,
  userId: scope === 'team' ? undefined : item.id,
  teamId: scope === 'team' ? item.id : undefined,
  username: scope === 'team' ? undefined : item.name,
  name: item.name,
  averageScore: item.scoreCount ? item.normalizedTotal / item.scoreCount : 0,
});

const normalizeV2Activity = activity => ({
  ...activity,
  _id: activity.id,
  settings: { isActive: activity.isActive },
  subActivities: (activity.subActivities || []).map(subActivity => ({
    ...subActivity,
    _id: subActivity.id || subActivity._id,
  })),
});

const normalizeV2Team = team => ({
  ...team,
  _id: team.id,
  stats: {
    ...team.stats,
    memberCount: team.memberCount || 0,
    totalScore: team.stats?.totalScore || 0,
    activitiesCount: team.stats?.activitiesCount || 0,
  },
  members: team.members || [],
  activities: team.activities || [],
});

const getMobileHomeV2 = async () => {
  const chatId = requireChatId('accéder au dashboard');
  return apiV2Request(`/mobile/home${buildQuery({ chatId })}`);
};

// ===== AUTH =====
export const getMe = () => {
  if (API_V2_ENABLED) return apiV2Request('/auth/me');
  return apiRequest('/auth/me');
};

export const loginWithTelegram = async () => {
  const initData = globalThis.Telegram?.WebApp?.initData;
  if (!initData) throw new Error('Pas de données Telegram disponibles');
  const request = API_V2_ENABLED ? apiV2Request : apiRequest;
  const result = await request('/auth/telegram-login', {
    method: 'POST',
    body: JSON.stringify({ initData }),
  });
  if (result.token) localStorage.setItem('scory_token', result.token);
  return result;
};

// ===== ACTIVITIES =====
export const getActivities = (params = {}) => {
  const chatId = requireChatId('accéder aux activités');
  const query = { ...params, chatId };

  if (isApiV2EnabledForChat(chatId)) {
    const v2Params = omitParams(query, ['limit', 'includeSubActivities']);
    return apiV2Request(`/mobile/activities${buildQuery(v2Params)}`)
      .then(data => ({
        ...data,
        activities: (data.activities || []).map(normalizeV2Activity),
      }));
  }

  return apiRequest(`/activities${buildQuery(query)}`);
};

export const createActivity = (data) => {
  const chatId = requireChatId('créer une activité');
  if (isApiV2EnabledForChat(chatId)) {
    return apiV2Request('/activities', { method: 'POST', body: JSON.stringify({ ...data, chatId }) });
  }
  return apiRequest('/activities', { method: 'POST', body: JSON.stringify({ ...data, chatId }) });
};

export const getActivity = (id) => {
  const chatId = requireChatId();
  if (isApiV2EnabledForChat(chatId)) {
    return apiV2Request(`/mobile/activities${buildQuery({ chatId })}`)
      .then(data => {
        const activity = (data.activities || []).map(normalizeV2Activity).find(item => item._id === id || item.id === id);
        if (!activity) throw new Error('Activité introuvable');
        return { activity };
      });
  }
  return apiRequest(`/activities/${id}${buildQuery({ chatId })}`);
};

// ===== SCORES =====
export const getScores = (params = {}) => {
  const query = { ...params, chatId: requireChatId('accéder aux scores') };
  if (isApiV2EnabledForChat(query.chatId)) {
    return apiV2Request(`/scores${buildQuery(query)}`)
      .then(data => ({
        ...data,
        scores: (data.scores || []).map(normalizeV2Score),
      }));
  }
  return apiRequest(`/scores${buildQuery(query)}`);
};

export const getRankings = (params = {}) => {
  const chatId = requireChatId('accéder aux classements');
  const query = { ...params, chatId };

  if (isApiV2EnabledForChat(chatId)) {
    const v2Params = omitParams(query, ['limit']);
    return apiV2Request(`/mobile/rankings${buildQuery(v2Params)}`)
      .then(data => ({
        rankings: (data.items || []).map(item => normalizeV2Ranking(item, params.scope)),
        metadata: {
          scope: params.scope || 'individual',
          period: params.period || 'month',
          activityId: params.activityId,
          total: data.items?.length || 0,
          generatedAt: data.generatedAt,
          stale: data.stale,
        },
      }));
  }

  return apiRequest(`/scores/rankings${buildQuery(query)}`);
};

export const getPersonalScores = (params = {}) => {
  const chatId = requireChatId('accéder à vos scores');

  if (isApiV2EnabledForChat(chatId)) {
    return getMobileHomeV2().then(data => ({
      scores: (data.recentScores || []).map(normalizeV2Score).slice(0, Number(params.limit || 5)),
      personalStats: {
        totalPoints: data.userStats?.totalScore || 0,
        totalScores: data.userStats?.scoreCount || 0,
      },
    }));
  }

  return apiRequest(`/scores/personal${buildQuery({ ...params, chatId })}`);
};

export const addScore = (data) => {
  const chatId = requireChatId('ajouter un score');
  if (isApiV2EnabledForChat(chatId)) {
    const scoreData = { ...data };
    delete scoreData.subActivity;
    return apiV2Request('/scores', {
      method: 'POST',
      body: JSON.stringify({
        ...scoreData,
        chatId,
        ...(data.subActivityId && { subActivityId: data.subActivityId }),
      }),
    });
  }

  return apiRequest('/scores', {
    method: 'POST',
    body: JSON.stringify({ ...data, metadata: { ...(data.metadata), chatId } }),
  });
};

export const getPendingScores = (params = {}) => {
  const query = withChatId({ ...params, status: 'pending' }, 'accéder aux scores en attente');
  if (isApiV2EnabledForChat(query.chatId)) return apiV2Request(`/scores${buildQuery(query)}`);
  return apiRequest('/scores/pending' + buildQuery(withChatId(params, 'accéder aux scores en attente')));
};

export const approveScore = (id, data) =>
  isApiV2EnabledForChat()
    ? apiV2Request(`/scores/${id}/approve`, {
      method: 'PUT',
      ...(data && { body: JSON.stringify(data) }),
    })
    : apiRequest(`/scores/${id}/approve${buildQuery(withChatId({}, 'approuver un score'))}`, {
      method: 'PUT',
      ...(data && { body: JSON.stringify(data) }),
    });

export const rejectScore = (id, data) =>
  isApiV2EnabledForChat()
    ? apiV2Request(`/scores/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    : apiRequest(`/scores/${id}/reject${buildQuery(withChatId({}, 'rejeter un score'))}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

export const deleteScore = (id) =>
  isApiV2EnabledForChat()
    ? apiV2Request(`/scores/${id}`, { method: 'DELETE' })
    : apiRequest(`/scores/${id}${buildQuery(withChatId({}, 'supprimer un score'))}`, { method: 'DELETE' });

// ===== TEAMS =====
export const getTeams = (params = {}) => {
  const chatId = requireChatId('accéder aux équipes');
  const query = { ...params, chatId };

  if (isApiV2EnabledForChat(chatId)) {
    const v2Params = omitParams(query, ['limit']);
    return apiV2Request(`/mobile/teams${buildQuery(v2Params)}`)
      .then(data => ({
        ...data,
        teams: (data.teams || []).map(normalizeV2Team),
      }));
  }

  return apiRequest(`/teams${buildQuery(query)}`);
};

export const createTeam = (data) => {
  const chatId = requireChatId('créer une équipe');
  if (isApiV2EnabledForChat(chatId)) {
    return apiV2Request('/teams', { method: 'POST', body: JSON.stringify({ ...data, chatId }) });
  }
  return apiRequest('/teams', { method: 'POST', body: JSON.stringify({ ...data, chatId }) });
};

export const getTeam = (id) => {
  const chatId = requireChatId();
  if (isApiV2EnabledForChat(chatId)) {
    return apiV2Request(`/mobile/teams${buildQuery({ chatId })}`)
      .then(data => {
        const team = (data.teams || []).map(normalizeV2Team).find(item => item._id === id || item.id === id);
        if (!team) throw new Error('Équipe introuvable');
        return { team };
      });
  }
  return apiRequest(`/teams/${id}${buildQuery({ chatId })}`);
};

export const getTeamMembers = (id) => {
  const chatId = requireChatId();
  if (isApiV2EnabledForChat(chatId)) {
    return getTeam(id).then(data => ({ members: data.team?.members || [] }));
  }
  return apiRequest(`/teams/${id}/members${buildQuery({ chatId })}`);
};

export const getTeamStats = (id) => {
  const chatId = requireChatId();
  if (isApiV2EnabledForChat(chatId)) {
    return getTeam(id).then(data => ({ stats: data.team?.stats || {} }));
  }
  return apiRequest(`/teams/${id}/stats${buildQuery({ chatId })}`);
};

export const joinTeam = (joinCode) =>
  isApiV2EnabledForChat()
    ? apiV2Request('/teams/join', {
      method: 'POST',
      body: JSON.stringify(withChatId({ joinCode }, 'rejoindre une équipe')),
    })
    : apiRequest('/teams/join', {
    method: 'POST',
    body: JSON.stringify(withChatId({ joinCode }, 'rejoindre une équipe')),
  });

export const deleteTeam = (id) =>
  isApiV2EnabledForChat()
    ? apiV2Request(`/teams/${id}`, {
      method: 'DELETE',
      body: JSON.stringify(withChatId({}, 'supprimer une équipe')),
    })
    : apiRequest(`/teams/${id}${buildQuery(withChatId({}, 'supprimer une équipe'))}`, { method: 'DELETE' });

// ===== DASHBOARD =====
export const getDashboard = (params = {}) => {
  const chatId = requireChatId('accéder au dashboard');

  if (isApiV2EnabledForChat(chatId)) {
    return getMobileHomeV2().then(data => ({
      stats: {
        personal: {
          totalScore: data.userStats?.totalScore || 0,
          scores: data.userStats?.scoreCount || 0,
          ranking: data.userStats?.rank ? { position: data.userStats.rank } : null,
        },
        group: data.stats,
      },
      recentScores: (data.recentScores || []).map(normalizeV2Score),
      topRanking: (data.topRanking || []).map(item => normalizeV2Ranking(item, 'individual')),
      group: data.group,
      rankingGeneratedAt: data.rankingGeneratedAt,
    }));
  }

  return apiRequest(`/dashboard${buildQuery({ ...params, chatId })}`);
};

export const addSubActivity = (activityId, data) =>
  isApiV2EnabledForChat()
    ? apiV2Request(`/activities/${activityId}/subactivities`, {
      method: 'POST',
      body: JSON.stringify(withChatId(data, 'ajouter une sous-activité')),
    })
    : apiRequest(`/activities/${activityId}/subactivities`, {
      method: 'POST',
      body: JSON.stringify(withChatId(data, 'ajouter une sous-activité')),
    });

export const deleteActivity = (id) =>
  isApiV2EnabledForChat()
    ? apiV2Request(`/activities/${id}${buildQuery(withChatId({}, 'supprimer une activité'))}`, { method: 'DELETE' })
    : apiRequest(`/activities/${id}${buildQuery(withChatId({}, 'supprimer une activité'))}`, { method: 'DELETE' });

export const deleteSubActivity = (activityId, subId) =>
  isApiV2EnabledForChat()
    ? apiV2Request(
      `/activities/${activityId}/subactivities/${encodeURIComponent(subId)}${buildQuery(withChatId({}, 'supprimer une sous-activité'))}`,
      { method: 'DELETE' }
    )
    : apiRequest(
      `/activities/${activityId}/subactivities/${encodeURIComponent(subId)}${buildQuery(withChatId({}, 'supprimer une sous-activité'))}`,
      { method: 'DELETE' }
    );

// ===== USER =====
export const getUserProfile = () => getMe();
export const updateProfile = (data) =>
  API_V2_ENABLED
    ? apiV2Request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) })
    : apiRequest('/auth/profile', { method: 'PUT', body: JSON.stringify(data) });

// ===== GROUPS =====
export const getMyGroups = () => {
  if (API_V2_ENABLED) return apiV2Request('/groups');
  return apiRequest('/groups');
};

export const getGroup = (chatId) => {
  if (isApiV2EnabledForChat(chatId)) return apiV2Request(`/groups/${encodeURIComponent(chatId)}`);
  return apiRequest(`/groups/${chatId}`);
};
