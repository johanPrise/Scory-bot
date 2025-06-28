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
export const login = (username, password) => fetchAPI('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username, password }),
});

// Récupérer les informations de l'utilisateur connecté
export const getCurrentUser = () => fetchAPI('/auth/me');

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

// Gestion des groupes (pour le rôle creator)
export const getGroups = () => fetchAPI('/groups');
export const getGroupById = (groupId) => fetchAPI(`/groups/${groupId}`);
export const createGroup = (group) => fetchAPI('/groups', {
  method: 'POST',
  body: JSON.stringify(group),
});
export const updateGroup = (groupId, group) => fetchAPI(`/groups/${groupId}`, {
  method: 'PUT',
  body: JSON.stringify(group),
});
export const deleteGroup = (groupId) => fetchAPI(`/groups/${groupId}`, {
  method: 'DELETE',
});

// Gestion des admins de groupe (pour le rôle creator)
export const getGroupAdmins = (groupId) => fetchAPI(`/groups/${groupId}/admins`);
export const addGroupAdmin = (groupId, userId) => fetchAPI(`/groups/${groupId}/admins`, {
  method: 'POST',
  body: JSON.stringify({ userId }),
});
export const removeGroupAdmin = (groupId, userId) => fetchAPI(`/groups/${groupId}/admins/${userId}`, {
  method: 'DELETE',
});

// Gestion des membres de groupe (pour le rôle groupAdmin)
export const getGroupMembers = (groupId) => fetchAPI(`/groups/${groupId}/members`);
export const addGroupMember = (groupId, member) => fetchAPI(`/groups/${groupId}/members`, {
  method: 'POST',
  body: JSON.stringify(member),
});
export const updateGroupMember = (groupId, memberId, member) => fetchAPI(`/groups/${groupId}/members/${memberId}`, {
  method: 'PUT',
  body: JSON.stringify(member),
});
export const deleteGroupMember = (groupId, memberId) => fetchAPI(`/groups/${groupId}/members/${memberId}`, {
  method: 'DELETE',
});

// Gestion des scores de groupe (pour le rôle groupAdmin)
export const getGroupScores = (groupId) => fetchAPI(`/groups/${groupId}/scores`);
export const addGroupScore = (groupId, score) => fetchAPI(`/groups/${groupId}/scores`, {
  method: 'POST',
  body: JSON.stringify(score),
});
export const updateGroupScore = (groupId, scoreId, score) => fetchAPI(`/groups/${groupId}/scores/${scoreId}`, {
  method: 'PUT',
  body: JSON.stringify(score),
});
export const deleteGroupScore = (groupId, scoreId) => fetchAPI(`/groups/${groupId}/scores/${scoreId}`, {
  method: 'DELETE',
});

// Gestion des équipes de groupe (pour le rôle groupAdmin)
export const getGroupTeams = (groupId) => fetchAPI(`/groups/${groupId}/teams`);
export const addGroupTeam = (groupId, team) => fetchAPI(`/groups/${groupId}/teams`, {
  method: 'POST',
  body: JSON.stringify(team),
});
export const updateGroupTeam = (groupId, teamId, team) => fetchAPI(`/groups/${groupId}/teams/${teamId}`, {
  method: 'PUT',
  body: JSON.stringify(team),
});
export const deleteGroupTeam = (groupId, teamId) => fetchAPI(`/groups/${groupId}/teams/${teamId}`, {
  method: 'DELETE',
});

// Gestion des paramètres de groupe (pour le rôle groupAdmin)
export const getGroupSettings = (groupId) => fetchAPI(`/groups/${groupId}/settings`);
export const updateGroupSettings = (groupId, settings) => fetchAPI(`/groups/${groupId}/settings`, {
  method: 'PUT',
  body: JSON.stringify(settings),
});

// Settings
export const getSettings = async () => {
  return fetchAPI('/settings', { method: 'GET' });
};

export const updateSettings = async (settings) => {
  return fetchAPI('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
};

// Dashboard and Stats
export const getDashboardStats = async () => {
  return fetchAPI('/dashboard-stats', { method: 'GET' });
};

export const getStatsData = async (timeRange) => {
  return fetchAPI(`/stats?range=${timeRange}`, { method: 'GET' });
};

// Tableau de bord
export const dashboard = {
  getStats: (period = 'month') => fetchAPI(`/dashboard/stats?period=${period}`),
  getRecentActivity: (limit = 10) => fetchAPI(`/dashboard/activity?limit=${limit}`),
  getTopPerformers: (options = {}) => {
    const { period = 'month', scope = 'individual', limit = 5 } = options;
    return fetchAPI(`/dashboard/top-performers?period=${period}&scope=${scope}&limit=${limit}`);
  }
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
  bulkApprove: (scoreIds, comments = '') => fetchAPI('/scores/bulk/approve', {
    method: 'PUT',
    body: JSON.stringify({ scoreIds, comments })
  }),
  
  bulkReject: (scoreIds, reason, comments = '') => fetchAPI('/scores/bulk/reject', {
    method: 'PUT',
    body: JSON.stringify({ scoreIds, reason, comments })
  }),
  
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
  getHistory: (filters = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    return fetchAPI(`/scores/history?${queryParams.toString()}`);
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
  },
  
  // Statistiques d'une activité
  getStats: (activityId, period = 'month') => fetchAPI(`/activities/${activityId}/stats?period=${period}`),
  
  // Participants d'une activité
  getParticipants: (activityId) => fetchAPI(`/activities/${activityId}/participants`),
  
  // Dupliquer une activité
  duplicate: (activityId, newData = {}) => fetchAPI(`/activities/${activityId}/duplicate`, {
    method: 'POST',
    body: JSON.stringify(newData)
  }),
  
  // Archiver/désarchiver une activité
  archive: (activityId) => fetchAPI(`/activities/${activityId}/archive`, {
    method: 'PUT'
  }),
  
  unarchive: (activityId) => fetchAPI(`/activities/${activityId}/unarchive`, {
    method: 'PUT'
  })
};

// Compatibilité avec l'ancienne API
export const fetchActivities = () => activities.getAll();
export const createActivity = (activity) => activities.create(activity);
export const updateActivity = (activityId, activity) => activities.update(activityId, activity);
export const deleteActivity = (activityId) => activities.delete(activityId);
