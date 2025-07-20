import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getTeams as getGroups,
  createTeam as createGroup,
  updateTeam as updateGroup,
  deleteTeam as deleteGroup,
  getTeamMembers as getGroupMembers,
  addTeamMember as addGroupMember,
  deleteTeamMember as removeGroupMember,
} from '../../../../api';
import { useAuth } from '../../../../context/AuthContext';

export const useCreatorGroups = (notify) => {
  const { currentUser } = useAuth();

  // Data state
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination and filter state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog and form state
  const [openForm, setOpenForm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [currentGroupMembers, setCurrentGroupMembers] = useState([]);
  const [currentGroupId, setCurrentGroupId] = useState(null);

  // Action loading states
  const [formLoading, setFormLoading] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm,
      };
      const data = await getGroups(params);
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      notify('Erreur lors du chargement des groupes', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify, page, rowsPerPage, searchTerm]);

  useEffect(() => {
    if (currentUser) {
      fetchGroups();
    }
  }, [currentUser, fetchGroups]);

  const filteredGroups = useMemo(() => {
    return groups;
  }, [groups]);

  // Form and Dialog handlers
  const handleOpenForm = (group = null) => {
    setSelectedGroup(group);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setSelectedGroup(null);
  };

  const handleSubmit = async (formData) => {
    try {
      setFormLoading(true);
      if (selectedGroup) {
        await updateGroup(selectedGroup._id, formData);
        notify('Groupe mis à jour avec succès', 'success');
      } else {
        await createGroup(formData);
        notify('Groupe créé avec succès', 'success');
      }
      fetchGroups();
      handleCloseForm();
    } catch (error) {
      notify(error.message || "Erreur lors de l'enregistrement", 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (group) => {
    setGroupToDelete(group);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!groupToDelete) return;
    try {
      setFormLoading(true);
      await deleteGroup(groupToDelete._id);
      notify('Groupe supprimé avec succès', 'success');
      fetchGroups();
    } catch (error) {
      notify(error.message || 'Erreur lors de la suppression', 'error');
    } finally {
      setDeleteDialogOpen(false);
      setGroupToDelete(null);
      setFormLoading(false);
    }
  };

  // Member management
  const handleOpenMembersDialog = async (group) => {
    try {
      setCurrentGroupId(group._id);
      const members = await getGroupMembers(group._id);
      setCurrentGroupMembers(members);
      setMembersDialogOpen(true);
    } catch (error) {
      notify('Erreur lors du chargement des membres', 'error');
    }
  };

  const handleCloseMembersDialog = () => {
    setMembersDialogOpen(false);
    setCurrentGroupId(null);
    setCurrentGroupMembers([]);
  };

  const handleAddMember = async (email) => {
    try {
      const newMember = await addGroupMember(currentGroupId, { email });
      setCurrentGroupMembers((prev) => [...prev, newMember]);
      // Optionally update member count in the main list
      setGroups(prev => prev.map(g => g._id === currentGroupId ? {...g, memberCount: (g.memberCount || 0) + 1} : g));
      notify('Membre ajouté avec succès', 'success');
    } catch (error) {
      notify(error.message || "Erreur lors de l'ajout du membre", 'error');
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await removeGroupMember(currentGroupId, memberId);
      setCurrentGroupMembers((prev) => prev.filter((m) => m._id !== memberId));
      setGroups(prev => prev.map(g => g._id === currentGroupId ? {...g, memberCount: Math.max(0, (g.memberCount || 1) - 1)} : g));
      notify('Membre retiré avec succès', 'success');
    } catch (error) {
      notify(error.message || 'Erreur lors du retrait du membre', 'error');
    }
  };

  return {
    groups: filteredGroups,
    loading,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    searchTerm,
    setSearchTerm,
    openForm,
    selectedGroup,
    formLoading,
    deleteDialogOpen,
    groupToDelete,
    membersDialogOpen,
    currentGroupMembers,
    handleOpenForm,
    handleCloseForm,
    handleSubmit,
    handleDeleteClick,
    handleDeleteConfirm,
    setDeleteDialogOpen,
    fetchGroups,
    handleOpenMembersDialog,
    handleCloseMembersDialog,
    handleAddMember,
    handleRemoveMember,
  };
};
