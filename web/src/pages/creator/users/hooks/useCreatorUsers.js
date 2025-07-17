import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  addUserToTeam,
  removeUserFromTeam,
  linkTelegramForUser,
  unlinkTelegramForUser,
  getTeams,
} from '../../../../api';
import { useAuth } from '../../../../context/AuthContext';

export const useCreatorUsers = (notify) => {
  const { currentUser } = useAuth();

  // Data state
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
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

  // New states for Telegram linking and Team management
  const [openLinkTelegramDialog, setOpenLinkTelegramDialog] = useState(false);
  const [userToLinkTelegram, setUserToLinkTelegram] = useState(null);
  const [openManageTeamsDialog, setOpenManageTeamsDialog] = useState(false);
  const [userToManageTeams, setUserToManageTeams] = useState(null);

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

      const teamsData = await getTeams();
      setTeams(teamsData.teams || []);
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
      setFormLoading(false);
    }
  };

  // Handlers for Telegram linking
  const handleOpenLinkTelegramDialog = (user) => {
    setUserToLinkTelegram(user);
    setOpenLinkTelegramDialog(true);
  };

  const handleCloseLinkTelegramDialog = () => {
    setOpenLinkTelegramDialog(false);
    setUserToLinkTelegram(null);
  };

  const handleLinkTelegram = async (code) => {
    if (!userToLinkTelegram) return;
    try {
      setFormLoading(true);
      await linkTelegramForUser(userToLinkTelegram._id, code);
      notify('Compte Telegram lié avec succès', 'success');
      fetchUsers();
      handleCloseLinkTelegramDialog();
    } catch (error) {
      console.error('Error linking Telegram:', error);
      notify(error.message || 'Erreur lors de la liaison Telegram', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    if (!userToLinkTelegram) return;
    try {
      setFormLoading(true);
      await unlinkTelegramForUser(userToLinkTelegram._id);
      notify('Compte Telegram délié avec succès', 'success');
      fetchUsers();
      handleCloseLinkTelegramDialog();
    } catch (error) {
      console.error('Error unlinking Telegram:', error);
      notify(error.message || 'Erreur lors de la déliaison Telegram', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // Handlers for Team management
  const handleOpenManageTeamsDialog = (user) => {
    setUserToManageTeams(user);
    setOpenManageTeamsDialog(true);
  };

  const handleCloseManageTeamsDialog = () => {
    setOpenManageTeamsDialog(false);
    setUserToManageTeams(null);
  };

  const handleAddUserToTeam = async (teamId, role) => {
    if (!userToManageTeams) return;
    try {
      setFormLoading(true);
      await addUserToTeam(userToManageTeams._id, teamId, role);
      notify('Utilisateur ajouté à l\'équipe avec succès', 'success');
      fetchUsers();
    } catch (error) {
      console.error('Error adding user to team:', error);
      notify(error.message || 'Erreur lors de l\'ajout à l\'équipe', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleRemoveUserFromTeam = async (teamId) => {
    if (!userToManageTeams) return;
    try {
      setFormLoading(true);
      await removeUserFromTeam(userToManageTeams._id, teamId);
      notify('Utilisateur retiré de l\'équipe avec succès', 'success');
      fetchUsers();
    } catch (error) {
      console.error('Error removing user from team:', error);
      notify(error.message || 'Erreur lors du retrait de l\'équipe', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  return {
    users: filteredUsers,
    teams,
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
    openLinkTelegramDialog,
    userToLinkTelegram,
    openManageTeamsDialog,
    userToManageTeams,
    handleOpenLinkTelegramDialog,
    handleCloseLinkTelegramDialog,
    handleLinkTelegram,
    handleUnlinkTelegram,
    handleOpenManageTeamsDialog,
    handleCloseManageTeamsDialog,
    handleAddUserToTeam,
    handleRemoveUserFromTeam,
  };
};
