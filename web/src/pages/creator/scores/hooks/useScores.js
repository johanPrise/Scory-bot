import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useNotification } from '../../../../contexts/NotificationContext';
import { 
  getScores, 
  getUsers, 
  getActivities, 
  createScore, 
  updateScore,
  deleteScore,
  deleteScores
} from '../../../../api';

const useScores = () => {
  const { currentUser } = useAuth();
  const { notify } = useNotification();
  
  // États pour les données
  const [scores, setScores] = useState([]);
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // États pour la pagination et le tri
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  
  // États pour les filtres
  const [filters, setFilters] = useState({
    status: 'all',
    userId: '',
    activityId: '',
    dateRange: {
      start: null,
      end: null
    }
  });
  
  // États pour la recherche
  const [searchQuery, setSearchQuery] = useState('');
  
  // États pour les dialogues
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedScore, setSelectedScore] = useState(null);
  const [selectedScores, setSelectedScores] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const exportLoading = false; // État simplifié car non utilisé
  
  // Charger les données
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [scoresData, usersData, activitiesData] = await Promise.all([
        getScores(),
        getUsers(),
        getActivities()
      ]);
      
      setScores(scoresData);
      setUsers(usersData);
      setActivities(activitiesData);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      notify(error.message || 'Erreur lors du chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);
  
  // Gestion des scores
  const handleCreateScore = useCallback(async (scoreData) => {
    try {
      await createScore(scoreData);
      notify('Score ajouté avec succès', 'success');
      fetchData();
      return true;
    } catch (error) {
      notify(error.message || "Erreur lors de l'ajout du score", 'error');
      return false;
    }
  }, [fetchData, notify]);
  
  const handleUpdateScore = useCallback(async (id, scoreData) => {
    try {
      await updateScore(id, scoreData);
      notify('Score mis à jour avec succès', 'success');
      fetchData();
      return true;
    } catch (error) {
      notify(error.message || 'Erreur lors de la mise à jour du score', 'error');
      return false;
    }
  }, [fetchData, notify]);
  
  const handleDeleteScore = useCallback(async (id) => {
    try {
      setDeleteLoading(true);
      await deleteScore(id);
      notify('Score supprimé avec succès', 'success');
      fetchData();
      setDeleteDialogOpen(false);
      return true;
    } catch (error) {
      notify(error.message || 'Erreur lors de la suppression du score', 'error');
      return false;
    } finally {
      setDeleteLoading(false);
    }
  }, [fetchData, notify]);
  
  const handleBulkDelete = useCallback(async () => {
    try {
      setBulkDeleteLoading(true);
      await deleteScores(selectedScores);
      notify('Scores supprimés avec succès', 'success');
      setSelectedScores([]);
      fetchData();
      setBulkDeleteDialogOpen(false);
    } catch (error) {
      notify(error.message || 'Erreur lors de la suppression des scores', 'error');
    } finally {
      setBulkDeleteLoading(false);
    }
  }, [selectedScores, fetchData, notify]);
  
  // Gestion du tri
  const handleRequestSort = useCallback((property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  }, [orderBy, order]);
  
  // Gestion des filtres
  const handleFilterChange = useCallback((name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPage(0); // Réinitialiser à la première page lors du changement de filtre
  }, []);
  
  // Gestion de la sélection
  // Filtrer et trier les scores
  const filteredAndSortedScores = useMemo(() => {
    // Appliquer les filtres
    const filteredScores = scores.filter(score => {
      // Filtres
      if (filters.status !== 'all' && score.approved !== (filters.status === 'approved')) return false;
      if (filters.userId && score.user?._id !== filters.userId) return false;
      if (filters.activityId && score.activity?._id !== filters.activityId) return false;
      
      // Filtre par date
      const scoreDate = new Date(score.createdAt);
      const startDate = filters.dateRange.start ? new Date(filters.dateRange.start) : null;
      const endDate = filters.dateRange.end ? new Date(filters.dateRange.end + 'T23:59:59') : null;
      
      if (startDate && scoreDate < startDate) return false;
      if (endDate && scoreDate > endDate) return false;
      
      // Recherche dans plusieurs champs
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const userName = score.user?.name?.toLowerCase() || '';
        const userEmail = score.user?.email?.toLowerCase() || '';
        const activityName = score.activity?.name?.toLowerCase() || '';
        const notes = score.notes?.toLowerCase() || '';
        
        if (!userName.includes(query) && 
            !userEmail.includes(query) && 
            !activityName.includes(query) && 
            !notes.includes(query)) {
          return false;
        }
      }
      
      return true;
    });
    
    // Trier les scores
    return [...filteredScores].sort((a, b) => {
      let valueA, valueB;
      
      // Gérer les propriétés imbriquées (user.name, activity.name, etc.)
      if (orderBy.includes('.')) {
        const [parent, child] = orderBy.split('.');
        valueA = a[parent]?.[child] || '';
        valueB = b[parent]?.[child] || '';
      } else {
        valueA = a[orderBy];
        valueB = b[orderBy];
      }
      
      // Trier par ordre croissant ou décroissant
      if (order === 'asc') {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
      }
    });
  }, [scores, filters, searchQuery, orderBy, order]);

  const handleSelectAllClick = useCallback((event) => {
    if (event.target.checked) {
      const newSelected = filteredAndSortedScores.map((score) => score._id);
      setSelectedScores(newSelected);
      return;
    }
    setSelectedScores([]);
  }, [filteredAndSortedScores]);
  
  const handleSelectClick = useCallback((event, id) => {
    const selectedIndex = selectedScores.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedScores, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectedScores.slice(1));
    } else if (selectedIndex === selectedScores.length - 1) {
      newSelected = newSelected.concat(selectedScores.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectedScores.slice(0, selectedIndex),
        selectedScores.slice(selectedIndex + 1),
      );
    }

    setSelectedScores(newSelected);
  }, [selectedScores]);
  

  
  // Pagination
  const paginatedScores = useMemo(() => {
    return filteredAndSortedScores.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [filteredAndSortedScores, page, rowsPerPage]);
  
  // Calculer les statistiques
  const stats = useMemo(() => {
    const totalPoints = filteredAndSortedScores.reduce((sum, score) => sum + (score.points || 0), 0);
    const pendingCount = filteredAndSortedScores.filter(score => !score.approved).length;
    const approvedCount = filteredAndSortedScores.length - pendingCount;
    
    return {
      totalScores: filteredAndSortedScores.length,
      totalPoints,
      avgPoints: filteredAndSortedScores.length > 0 ? (totalPoints / filteredAndSortedScores.length).toFixed(1) : 0,
      pendingCount,
      approvedCount
    };
  }, [filteredAndSortedScores]);
  
  // Effet pour charger les données au montage
  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, fetchData]);
  
  return {
    // États
    scores: paginatedScores,
    users,
    activities,
    loading,
    page,
    rowsPerPage,
    orderBy,
    order,
    filters,
    searchQuery,
    formOpen,
    deleteDialogOpen,
    bulkDeleteDialogOpen,
    selectedScore,
    selectedScores,
    deleteLoading,
    bulkDeleteLoading,
    exportLoading,
    stats,
    totalCount: filteredAndSortedScores.length,
    
    // Handlers
    setPage,
    setRowsPerPage,
    setSearchQuery,
    setFormOpen,
    setDeleteDialogOpen,
    setBulkDeleteDialogOpen,
    setSelectedScore,
    setSelectedScores,
    handleCreateScore,
    handleUpdateScore,
    handleDeleteScore,
    handleBulkDelete,
    handleRequestSort,
    handleFilterChange,
    handleSelectAllClick,
    handleSelectClick,
    fetchData
  };
};

export default useScores;
