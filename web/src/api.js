// Fichier centralisé pour les appels API REST côté frontend
// À adapter selon l'URL de ton backend

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Helper générique pour requêtes fetch avec gestion des erreurs
async function fetchAPI(endpoint, options = {}) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers,
      },
      ...options,
    });
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur API');
      return data;
    } else {
      const text = await res.text();
      throw new Error(`Unexpected response format: ${text.slice(0, 100)}...`);
    }
  } catch (error) {
    console.error(`API Error for ${endpoint}:`, error);
    throw error;
  }
}

// Authentification
export const loginUser = (username, password) => fetchAPI('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username, password }),
});

// Authentification Telegram
export const telegramLogin = (initData) => fetchAPI('/auth/telegram', {
  method: 'POST',
  body: JSON.stringify({ initData }),
});

// Inscription
export const registerUser = (username, email, password, firstName, lastName) => fetchAPI('/auth/register', {
  method: 'POST',
  body: JSON.stringify({ username, email, password, firstName, lastName }),
});

// Récupérer les informations de l'utilisateur connecté
export const getCurrentUser = () => fetchAPI('/auth/me');

// Changer le mot de passe
export const changePassword = (currentPassword, newPassword) => fetchAPI('/auth/change-password', {
  method: 'POST',
  body: JSON.stringify({ currentPassword, newPassword }),
});

// Lier/Délier Telegram
export const linkTelegramAccount = (telegramId, telegramUsername, chatId) => fetchAPI('/auth/link-telegram', {
  method: 'POST',
  body: JSON.stringify({ telegramId, telegramUsername, chatId }),
});

export const unlinkTelegramAccount = () => fetchAPI('/auth/unlink-telegram', {
  method: 'DELETE',
});

// Lier/Délier Telegram pour un utilisateur spécifique (admin)
export const linkTelegramForUser = (userId, code) => fetchAPI(`/users/link-telegram`, {
  method: 'POST',
  body: JSON.stringify({ userId, code }),
});

export const unlinkTelegramForUser = (userId) => fetchAPI(`/users/unlink-telegram`, {
  method: 'POST',
  body: JSON.stringify({ userId }),
});

// Gestion des utilisateurs (pour le rôle creator)
export const getUsers = () => fetchAPI('/users');
export const getUserById = (userId) => fetchAPI(`/users/${userId}`);
export const createUser = (user) => fetchAPI('/users', {
  method: 'POST',
  body: JSON.stringify(user),
});
export const updateUser = (userId, user) => fetchAPI(`/users/${userId}`, {
  method: 'PUT',
  body: JSON.stringify(user),
});
export const deleteUser = (userId) => fetchAPI(`/users/${userId}`, {
  method: 'DELETE',
});

// Gestion des équipes d'utilisateurs (pour le rôle admin/superadmin)
export const addUserToTeam = (userId, teamId, role = 'member') => fetchAPI(`/users/${userId}/teams/${teamId}`, {
  method: 'POST',
  body: JSON.stringify({ role }),
});

export const removeUserFromTeam = (userId, teamId) => fetchAPI(`/users/${userId}/teams/${teamId}`, {
  method: 'DELETE',
});

// Gestion des groupes (pour le rôle creator)
export const getTeams = () => fetchAPI('/teams');
export const getTeamById = (teamId) => fetchAPI(`/teams/${teamId}`);
export const createTeam = (team) => fetchAPI('/teams', {
  method: 'POST',
  body: JSON.stringify(team),
});
export const updateTeam = (teamId, team) => fetchAPI(`/teams/${teamId}`, {
  method: 'PUT',
  body: JSON.stringify(team),
});
export const deleteTeam = (teamId) => fetchAPI(`/teams/${teamId}`, {
  method: 'DELETE',
});

// Gestion des admins de groupe (pour le rôle creator)
export const getTeamAdmins = (teamId) => fetchAPI(`/teams/${teamId}/members?role=admin`);
export const addTeamAdmin = (teamId, userId) => fetchAPI(`/teams/${teamId}/members`, {
  method: 'POST',
  body: JSON.stringify({ userId, isAdmin: true }),
});
export const removeTeamAdmin = (teamId, userId) => fetchAPI(`/teams/${teamId}/members/${userId}`, {
  method: 'DELETE',
});

// Gestion des membres de groupe (pour le rôle groupAdmin)
export const getTeamMembers = (teamId) => fetchAPI(`/teams/${teamId}/members`);
export const addTeamMember = (teamId, member) => fetchAPI(`/teams/${teamId}/members`, {
  method: 'POST',
  body: JSON.stringify(member),
});
export const updateTeamMember = (teamId, memberId, member) => fetchAPI(`/teams/${teamId}/members/${memberId}`, {
  method: 'PUT',
  body: JSON.stringify(member),
});
export const deleteTeamMember = (teamId, memberId) => fetchAPI(`/teams/${teamId}/members/${memberId}`, {
  method: 'DELETE',
});

// Gestion des scores de groupe (pour le rôle groupAdmin)
export const getTeamScores = (teamId) => fetchAPI(`/scores/team?teamId=${teamId}`);
export const addTeamScore = (teamId, score) => fetchAPI('/scores', {
  method: 'POST',
  body: JSON.stringify({ ...score, teamId }),
});
export const updateTeamScore = (teamId, scoreId, score) => fetchAPI(`/scores/${scoreId}`, {
  method: 'PUT',
  body: JSON.stringify({ ...score, teamId }),
});
export const deleteTeamScore = (teamId, scoreId) => fetchAPI(`/scores/${scoreId}`, {
  method: 'DELETE',
});

// Gestion des équipes de groupe (pour le rôle groupAdmin)
export const getTeamsByChatId = (chatId) => fetchAPI(`/teams?chatId=${chatId}`);


// Gestion des paramètres de groupe (pour le rôle groupAdmin)
export const getTeamSettings = (teamId) => fetchAPI(`/teams/${teamId}`);
export const updateTeamSettings = (teamId, settings) => fetchAPI(`/teams/${teamId}`, {
  method: 'PUT',
  body: JSON.stringify({ settings }),
});

// Settings
export const getUserSettings = async () => {
  return fetchAPI('/auth/me', { method: 'GET' });
};

export const updateUserSettings = async (settings) => {
  return fetchAPI('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify({ settings }),
  });
};

// Dashboard and Stats
export const getDashboardStats = async () => {
  return fetchAPI('/dashboard/stats', { method: 'GET' });
};

export const getStatsData = async (period) => {
  return fetchAPI(`/dashboard/stats?period=${period}`, { method: 'GET' });
};

// Tableau de bord
export const dashboard = {
  getStats: (period = 'month') => fetchAPI(`/dashboard/stats?period=${period}`),
  getRecentActivity: (limit = 10) => fetchAPI(`/dashboard/activity?limit=${limit}`),
};

  

// Scores
export const scores = {
  getAll: (filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    return fetchAPI(`/scores?${queryParams.toString()}`);
  },
  getPersonal: (filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    return fetchAPI(`/scores/personal?${queryParams.toString()}`);
  },
  getTeam: (filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    return fetchAPI(`/scores/team?${queryParams.toString()}`);
  },
  getPending: (filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    return fetchAPI(`/scores/pending?${queryParams.toString()}`);
  },
  
  // Gestion des sous-scores
  getSubScores: (activityId, filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    return fetchAPI(`/scores/sub-activities/${activityId}?${queryParams.toString()}`);
  },
  
  // Récupérer un score par ID
  getById: (scoreId) => fetchAPI(`/scores/${scoreId}`),
  
  // Créer un nouveau score
  create: (scoreData) => fetchAPI('/scores', {
    method: 'POST',
    body: JSON.stringify(scoreData)
  }),
  
  // Mettre à jour un score
  update: (scoreId, scoreData) => fetchAPI(`/scores/${scoreId}`, {
    method: 'PUT',
    body: JSON.stringify(scoreData)
  }),
  
  // Supprimer un score
  delete: (scoreId) => fetchAPI(`/scores/${scoreId}`, { method: 'DELETE' }),
  
  // Approuver un score
  approve: (scoreId, comments = '') => fetchAPI(`/scores/${scoreId}/approve`, { 
    method: 'PUT',
    body: JSON.stringify({ comments })
  }),
  
  // Rejeter un score
  reject: (scoreId, reason, comments = '') => fetchAPI(`/scores/${scoreId}/reject`, { 
    method: 'PUT',
    body: JSON.stringify({ reason, comments })
  }),
  
  // Récupérer les classements
  getRankings: (filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    return fetchAPI(`/scores/rankings?${queryParams.toString()}`);
  },
  
  // Actions en lot pour les administrateurs
  
  
  // Export de données
  export: async (filters = {}, format = 'csv') => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    queryParams.append('format', format);
    
    const token = localStorage.getItem('token');
    const response = await fetch(`${BASE_URL}/scores/export?${queryParams.toString()}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors de l\'export');
    }
    
    return response.blob();
  },
  
  // Historique des scores avec export
  getActivityHistory: (activityId, filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    return fetchAPI(`/activities/${activityId}/history?${queryParams.toString()}`);
  }
};

// Activités
export const activities = {
  // Récupérer toutes les activités
  getAll: (filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    return fetchAPI(`/activities?${queryParams.toString()}`);
  },
  
  // Récupérer une activité par ID
  getById: (activityId, options = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    return fetchAPI(`/activities/${activityId}?${queryParams.toString()}`);
  },
  
  // Créer une nouvelle activité
  create: (activityData) => fetchAPI('/activities', {
    method: 'POST',
    body: JSON.stringify(activityData)
  }),
  
  // Mettre à jour une activité
  update: (activityId, activityData) => fetchAPI(`/activities/${activityId}`, {
    method: 'PUT',
    body: JSON.stringify(activityData)
  }),
  
  // Supprimer une activité
  delete: (activityId) => fetchAPI(`/activities/${activityId}`, {
    method: 'DELETE'
  }),
  
  // Gestion des sous-activités
  subActivities: {
    // Ajouter une sous-activité
    add: (activityId, subActivityData) => fetchAPI(`/activities/${activityId}/sub-activities`, {
      method: 'POST',
      body: JSON.stringify(subActivityData)
    }),
    
    // Mettre à jour une sous-activité
    update: (activityId, subActivityId, subActivityData) => fetchAPI(`/activities/${activityId}/sub-activities/${subActivityId}`, {
      method: 'PUT',
      body: JSON.stringify(subActivityData)
    }),
    
    // Supprimer une sous-activité
    delete: (activityId, subActivityId) => fetchAPI(`/activities/${activityId}/sub-activities/${subActivityId}`, {
      method: 'DELETE'
    })
  },
  
  // Historique des activités
  getHistory: (filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    return fetchAPI(`/activities/history?${queryParams.toString()}`);
  }
};

// Feedback
export const feedback = {
  send: (type, message, activityId) => fetchAPI('/feedback', {
    method: 'POST',
    body: JSON.stringify({ type, message, activityId }),
  }),
  getGlobal: () => fetchAPI('/feedback/global'),
};

// Timers
export const timers = {
  start: (name, duration, activityId) => fetchAPI('/timers/start', {
    method: 'POST',
    body: JSON.stringify({ name, duration, activityId }),
  }),
  stop: (name, activityId) => fetchAPI('/timers/stop', {
    method: 'POST',
    body: JSON.stringify({ name, activityId }),
  }),
  getAll: (activityId) => {
    const queryParams = new URLSearchParams();
    if (activityId) queryParams.append('activityId', activityId);
    return fetchAPI(`/timers?${queryParams.toString()}`);
  },
};
  
  // Statistiques d'une activité
  

// Compatibilité avec l'ancienne API
export const fetchActivities = () => activities.getAll();
export const createActivity = (activity) => activities.create(activity);
export const updateActivity = (activityId, activity) => activities.update(activityId, activity);
export const deleteActivity = (activityId) => activities.delete(activityId);
