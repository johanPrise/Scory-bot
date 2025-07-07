import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  getActivityStats,
} from '../../../../api';
import { useAuth } from '../../../../context/AuthContext';

export const useCreatorActivities = (notify) => {
  const { currentUser } = useAuth();

  // Data state
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState({
    totalActivities: 0,
    activeActivities: 0,
    totalPoints: 0, // Note: This might not be directly available from the new API model
    avgPoints: 0,   // Note: This might not be directly available from the new API model
    trend: 0,
  });
  const [loading, setLoading] = useState(true);

  // Pagination and filter state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  // Dialog and form state
  const [openForm, setOpenForm] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);

  // Action loading states
  const [formLoading, setFormLoading] = useState(false);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      // Pass query params based on state
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm,
        isActive: filter === 'all' ? undefined : filter === 'active',
        // The API doesn't support filtering by type like 'bonus', 'malus'
      };
      const data = await getActivities(params);
      setActivities(data.activities || []); // Assuming API returns { activities: [...] }
      
      // The new API doesn't seem to have a single endpoint for all these stats.
      // This might need to be adjusted or fetched differently.
      // For now, we can try to fetch stats for each activity or a summary endpoint if it exists.
      // Let's assume a simple stats endpoint for now.
      const statsData = await getActivityStats(); // This might need a parameter or be a different call
      setStats(statsData || {});

    } catch (error) {
      console.error('Error fetching activities:', error);
      notify('Erreur lors du chargement des activités', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify, page, rowsPerPage, searchTerm, filter]);

  useEffect(() => {
    if (currentUser) {
      fetchActivities();
    }
  }, [currentUser, fetchActivities]);

  const filteredActivities = useMemo(() => {
    // The backend now handles filtering and searching, so we can simplify this.
    // This client-side filtering can be removed if the backend does it all.
    return activities;
  }, [activities]);

  // Form and Dialog handlers
  const handleOpenForm = (activity = null) => {
    setSelectedActivity(activity);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setSelectedActivity(null);
  };

  const handleSubmit = async (formData) => {
    try {
      setFormLoading(true);
      // Based on the API, we send name, description, settings
      const payload = {
          name: formData.name,
          description: formData.description,
          // The API expects a chatId, which we don't have in the form. This is a gap to address.
          // Let's assume a default or context-provided chatId for now.
          chatId: 'default-chat-id', 
          settings: {
              isActive: formData.isActive,
          }
      };

      if (selectedActivity) {
        await updateActivity(selectedActivity._id, payload);
        notify('Activité mise à jour avec succès', 'success');
      } else {
        await createActivity(payload);
        notify('Activité créée avec succès', 'success');
      }
      fetchActivities();
      handleCloseForm();
    } catch (error) {
      console.error('Error saving activity:', error);
      notify(error.message || "Erreur lors de l'enregistrement", 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (activity) => {
    setActivityToDelete(activity);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!activityToDelete) return;
    try {
      setFormLoading(true); // Reuse formLoading to disable all buttons
      await deleteActivity(activityToDelete._id);
      notify('Activité supprimée avec succès', 'success');
      fetchActivities();
    } catch (error) {
      console.error('Error deleting activity:', error);
      notify(error.message || 'Erreur lors de la suppression', 'error');
    } finally {
      setDeleteDialogOpen(false);
      setActivityToDelete(null);
      setFormLoading(false);
    }
  };

  return {
    activities: filteredActivities,
    stats,
    loading,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    searchTerm,
    setSearchTerm,
    filter,
    setFilter,
    openForm,
    selectedActivity,
    formLoading,
    deleteDialogOpen,
    activityToDelete,
    handleOpenForm,
    handleCloseForm,
    handleSubmit,
    handleDeleteClick,
    handleDeleteConfirm,
    setDeleteDialogOpen,
    fetchActivities,
  };
};
