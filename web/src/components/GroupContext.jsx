import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../api';
import { getChatId } from '../api';

const GroupContext = createContext(null);

/**
 * Provider qui gère le contexte de groupe Telegram
 * Permet de filtrer toutes les données par groupe sélectionné
 */
export function GroupProvider({ children }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(() => {
    // Initialiser depuis l'URL (chatId passé par le bot) ou sessionStorage
    return getChatId() || sessionStorage.getItem('scory_selectedGroup') || null;
  });
  const [loading, setLoading] = useState(true);

  // Charger la liste des groupes au montage
  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = useCallback(async () => {
    try {
      const data = await api.getMyGroups();
      setGroups(data.groups || []);
      
      // Si le chatId de l'URL correspond à un groupe existant, le sélectionner
      const urlChatId = getChatId();
      if (urlChatId) {
        const exists = (data.groups || []).some(g => g.chatId === urlChatId);
        if (exists) {
          setSelectedGroupId(urlChatId);
          sessionStorage.setItem('scory_selectedGroup', urlChatId);
        }
      }
    } catch (err) {
      console.warn('Impossible de charger les groupes:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectGroup = useCallback((chatId) => {
    setSelectedGroupId(chatId);
    if (chatId) {
      sessionStorage.setItem('scory_selectedGroup', chatId);
      sessionStorage.setItem('scory_chatId', chatId);
    } else {
      sessionStorage.removeItem('scory_selectedGroup');
      sessionStorage.removeItem('scory_chatId');
    }
  }, []);

  const selectedGroup = groups.find(g => g.chatId === selectedGroupId) || null;

  const value = {
    groups,
    selectedGroupId,
    selectedGroup,
    selectGroup,
    loading,
    refreshGroups: loadGroups
  };

  return (
    <GroupContext.Provider value={value}>
      {children}
    </GroupContext.Provider>
  );
}

/**
 * Hook pour accéder au contexte de groupe
 */
export function useGroup() {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error('useGroup doit être utilisé dans un GroupProvider');
  }
  return context;
}

export default GroupContext;
