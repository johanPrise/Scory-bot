import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getScores,
  getUsers,
  getActivities,
  createScore,
  updateScore,
  deleteScore,
  deleteScores,
} from '../../../../api';
import { useAuth } from '../../../../context/AuthContext';

export const useCreatorScores = (notify) => {
  const { currentUser } = useAuth();

  // Data state
  const [scores, setScores] = useState([]);
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination and sorting state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    userId: '',
    activityId: '',
    dateRange: { start: null, end: null },
  });
  const [showFilters, setShowFilters] = useState(false);

  // Selection state
  const [selected, setSelected] = useState([]);

  // Dialog state
  const [openForm, setOpenForm] = useState(false);
  const [selectedScore, setSelectedScore] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scoreToDelete, setScoreToDelete] = useState(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Loading state for actions
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [scoresData, usersData, activitiesData] = await Promise.all([
        getScores({
          sortBy: orderBy,
          sortOrder: order,
          page: page + 1,
          limit: rowsPerPage,
        }),
        getUsers(),
        getActivities(),
      ]);
      setScores(scoresData);
      setUsers(usersData);
      setActivities(activitiesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      notify('Erreur lors du chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  }, [orderBy, order, page, rowsPerPage, notify]);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, fetchData]);

  // Memoized filtered and sorted scores
  const filteredAndSortedScores = useMemo(() => {
    // This logic can be expanded based on the old component's filtering logic
    return scores
      .filter((score) => {
        const query = searchQuery.toLowerCase();
        const userName = score.user?.name?.toLowerCase() || '';
        const activityName = score.activity?.name?.toLowerCase() || '';
        return userName.includes(query) || activityName.includes(query);
      })
      .sort((a, b) => {
        const isAsc = order === 'asc';
        if (a[orderBy] < b[orderBy]) return isAsc ? -1 : 1;
        if (a[orderBy] > b[orderBy]) return isAsc ? 1 : -1;
        return 0;
      });
  }, [scores, searchQuery, orderBy, order]);

  // CRUD Handlers
  const handleOpenForm = (score = null) => {
    setSelectedScore(score);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setSelectedScore(null);
  };

  const handleSubmit = async (formData) => {
    try {
      setFormLoading(true);
      if (selectedScore) {
        await updateScore(selectedScore._id, formData);
        notify('Score mis à jour avec succès', 'success');
      } else {
        await createScore(formData);
        notify('Score ajouté avec succès', 'success');
      }
      fetchData();
      handleCloseForm();
    } catch (error) {
      notify(error.message || 'Erreur lors de la sauvegarde', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (score) => {
    setScoreToDelete(score);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!scoreToDelete) return;
    try {
      setDeleteLoading(true);
      await deleteScore(scoreToDelete._id);
      notify('Score supprimé avec succès', 'success');
      fetchData();
    } catch (error) {
      notify(error.message || 'Erreur lors de la suppression', 'error');
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
      setScoreToDelete(null);
    }
  };

  const handleBulkDeleteClick = () => {
    if (selected.length === 0) return;
    setBulkDeleteDialogOpen(true);
  };

  const handleBulkDeleteConfirm = async () => {
    try {
      setBulkDeleteLoading(true);
      await deleteScores(selected);
      notify(`${selected.length} score(s) supprimé(s)`, 'success');
      setSelected([]);
      fetchData();
    } catch (error) {
      notify(error.message || 'Erreur lors de la suppression en masse', 'error');
    } finally {
      setBulkDeleteLoading(false);
      setBulkDeleteDialogOpen(false);
    }
  };

  // Selection handlers
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = scores.map((n) => n._id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event, id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];
    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }
    setSelected(newSelected);
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;

  return {
    scores,
    users,
    activities,
    loading,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    orderBy,
    order,
    setOrderBy,
    setOrder,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    showFilters,
    setShowFilters,
    selected,
    setSelected,
    openForm,
    selectedScore,
    deleteDialogOpen,
    scoreToDelete,
    bulkDeleteDialogOpen,
    formLoading,
    deleteLoading,
    bulkDeleteLoading,
    exportLoading,
    setExportLoading,
    filteredAndSortedScores,
    handleOpenForm,
    handleCloseForm,
    handleSubmit,
    handleDeleteClick,
    handleDeleteConfirm,
    handleBulkDeleteClick,
    handleBulkDeleteConfirm,
    handleSelectAllClick,
    handleClick,
    isSelected,
    setScoreToDelete,
    setDeleteDialogOpen,
    setBulkDeleteDialogOpen,
  };
};
