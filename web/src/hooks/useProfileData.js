import { useState, useCallback, useEffect } from 'react';
import * as api from '../api';

function getUserFromProfileResponse(response) {
  return response.user || response;
}

function useProfileFetch(selectedGroupId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentScores, setRecentScores] = useState([]);
  const [editData, setEditData] = useState({ firstName: '', lastName: '' });

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [profileResult, scoresResult] = await Promise.allSettled([
        api.getUserProfile(),
        api.getPersonalScores({ limit: 10 }),
      ]);

      if (profileResult.status === 'fulfilled') {
        const user = getUserFromProfileResponse(profileResult.value);
        setProfile(user);
        setEditData({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
        });
      }

      if (scoresResult.status === 'fulfilled') {
        setRecentScores(scoresResult.value.scores || []);
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedGroupId) return;
    loadProfile();
  }, [selectedGroupId, loadProfile]);

  return { profile, loading, recentScores, editData, setEditData, loadProfile };
}

function useProfileEditor({ editData, setEditData, loadProfile, toast, triggerNotification, setShowEdit }) {
  const [saving, setSaving] = useState(false);

  const handleEditChange = useCallback((field, value) => {
    setEditData(currentData => ({
      ...currentData,
      [field]: value,
    }));
  }, [setEditData]);

  const handleSaveProfile = useCallback(async (successText) => {
    setSaving(true);
    try {
      await api.updateProfile(editData);
      triggerNotification?.('success');
      toast.success(successText || 'Profil mis à jour');
      setShowEdit(false);
      await loadProfile();
    } catch (error) {
      triggerNotification?.('error');
      toast.error(error.message || 'Erreur lors de la mise à jour du profil');
    } finally {
      setSaving(false);
    }
  }, [editData, loadProfile, toast, triggerNotification, setShowEdit]);

  return { saving, handleEditChange, handleSaveProfile };
}

export function useProfileData(selectedGroupId, toast, triggerNotification) {
  const [showEdit, setShowEdit] = useState(false);
  const { profile, loading, recentScores, editData, setEditData, loadProfile } = useProfileFetch(selectedGroupId);
  const { saving, handleEditChange, handleSaveProfile } = useProfileEditor({
    editData,
    setEditData,
    loadProfile,
    toast,
    triggerNotification,
    setShowEdit,
  });

  return {
    profile,
    loading,
    recentScores,
    showEdit,
    setShowEdit,
    editData,
    saving,
    handleEditChange,
    handleSaveProfile
  };
}
