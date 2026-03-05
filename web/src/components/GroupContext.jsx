import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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
    // Initialiser depuis l'URL (chatId passé par le bot) ou localStorage
    return getChatId() || localStorage.getItem('scory_selectedGroup') || null;
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
          localStorage.setItem('scory_selectedGroup', urlChatId);
        }
      }
      
      // Si aucun groupe n'est sélectionné et qu'il y a des groupes, sélectionner le premier
      if (!selectedGroupId && data.groups && data.groups.length > 0) {
        const firstGroupId = data.groups[0].chatId;
        setSelectedGroupId(firstGroupId);
        localStorage.setItem('scory_selectedGroup', firstGroupId);
      }
    } catch (err) {
      console.warn('Impossible de charger les groupes:', err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedGroupId]);

  const selectGroup = useCallback((chatId) => {
    if (!chatId) {
      console.warn('Tentative de sélection d\'un groupe null - ignoré');
      return;
    }
    
    setSelectedGroupId(chatId);
    localStorage.setItem('scory_selectedGroup', chatId);
    sessionStorage.setItem('scory_chatId', chatId);
  }, []);

  const selectedGroup = useMemo(
    () => groups.find(g => g.chatId === selectedGroupId) || null,
    [groups, selectedGroupId]
  );

  const value = useMemo(
    () => ({
      groups,
      selectedGroupId,
      selectedGroup,
      selectGroup,
      loading,
      refreshGroups: loadGroups
    }),
    [groups, selectedGroupId, selectedGroup, selectGroup, loading, loadGroups]
  );

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
