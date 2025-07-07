import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../../../../api';
import { useAuth } from '../../../../context/AuthContext';

export const useCreatorUsers = (notify) => {
  const { currentUser } = useAuth();

  // Data state
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination and filter state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog and form state
  const [openForm, setOpenForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Action loading states
  const [formLoading, setFormLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm,
      };
      const data = await getUsers(params);
      setUsers(data.users || []); // Assuming API returns { users: [...] }
    } catch (error) {
      console.error('Error fetching users:', error);
      notify('Erreur lors du chargement des utilisateurs', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify, page, rowsPerPage, searchTerm]);

  useEffect(() => {
    if (currentUser) {
      fetchUsers();
    }
  }, [currentUser, fetchUsers]);

  const filteredUsers = useMemo(() => {
    // Backend handles filtering, client-side can be simpler or removed
    return users;
  }, [users]);

  // Form and Dialog handlers
  const handleOpenForm = (user = null) => {
    setSelectedUser(user);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setSelectedUser(null);
  };

  const handleSubmit = async (formData) => {
    try {
      setFormLoading(true);
      if (selectedUser) {
        // Don't send empty password
        if (!formData.password) {
          delete formData.password;
        }
        await updateUser(selectedUser._id, formData);
        notify('Utilisateur mis à jour avec succès', 'success');
      } else {
        await createUser(formData);
        notify('Utilisateur créé avec succès', 'success');
      }
      fetchUsers();
      handleCloseForm();
    } catch (error) {
      console.error('Error saving user:', error);
      notify(error.message || "Erreur lors de l'enregistrement", 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    try {
      setFormLoading(true);
      await deleteUser(userToDelete._id);
      notify('Utilisateur supprimé avec succès', 'success');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      notify(error.message || 'Erreur lors de la suppression', 'error');
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      setFormLoading(false);
    }
  };

  return {
    users: filteredUsers,
    loading,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    searchTerm,
    setSearchTerm,
    openForm,
    selectedUser,
    formLoading,
    deleteDialogOpen,
    userToDelete,
    handleOpenForm,
    handleCloseForm,
    handleSubmit,
    handleDeleteClick,
    handleDeleteConfirm,
    setDeleteDialogOpen,
    fetchUsers,
  };
};
