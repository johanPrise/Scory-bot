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

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getMyGroups();
      const fetchedGroups = data.groups || [];
      setGroups(fetchedGroups);
      
      // Si le chatId de l'URL correspond à un groupe existant, le sélectionner
      const urlChatId = getChatId();
      if (urlChatId) {
        const exists = fetchedGroups.some(g => g.chatId === urlChatId);
        if (exists) {
          setSelectedGroupId(urlChatId);
          localStorage.setItem('scory_selectedGroup', urlChatId);
          return; // groupe trouvé via URL, on s'arrête
        }
      }
      
      // Si aucun groupe sélectionné, auto-sélectionner le premier
      setSelectedGroupId(prev => {
        if (!prev && fetchedGroups.length > 0) {
          const firstGroupId = fetchedGroups[0].chatId;
          localStorage.setItem('scory_selectedGroup', firstGroupId);
          return firstGroupId;
        }
        return prev;
      });
    } catch (err) {
      console.warn('Impossible de charger les groupes:', err.message);
      alert('Erreur API Groupes: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []); // pas de dépendances : la fonction est stable

  // Charger la liste des groupes au montage
  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

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
// eslint-disable-next-line react-refresh/only-export-components
export function useGroup() {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error('useGroup doit être utilisé dans un GroupProvider');
  }
  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export default GroupContext;
