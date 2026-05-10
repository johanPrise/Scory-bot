import { useState, useEffect, useCallback } from 'react';
import * as api from '../api';
import { useToast } from '../components/Toast';

const EMPTY_SUB_FORM = { name: '', description: '', maxScore: 100 };

const notifyHaptic = (type) => {
  globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
};

const impactHaptic = (type = 'light') => {
  globalThis.Telegram?.WebApp?.HapticFeedback?.impactOccurred(type);
};

const confirmAction = (message) =>
  new Promise((resolve) => {
    const tg = globalThis.Telegram?.WebApp;
    if (tg?.showConfirm) {
      tg.showConfirm(message, resolve);
    } else {
      resolve(globalThis.confirm(message));
    }
  });

export function useActivityDetail({ id, navigate, enabled }) {
  const toast = useToast();

  const [activity, setActivity] = useState(null);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [activeTab, setActiveTab] = useState('info');
  const [showSubForm, setShowSubForm] = useState(false);
  const [subForm, setSubForm] = useState(EMPTY_SUB_FORM);
  const [submittingSub, setSubmittingSub] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadActivity = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [actRes, scoresRes] = await Promise.allSettled([
        api.getActivity(id),
        api.getScores({ activityId: id, limit: 20 }),
      ]);
      if (actRes.status === 'fulfilled') setActivity(actRes.value.activity || actRes.value);
      if (scoresRes.status === 'fulfilled') setScores(scoresRes.value.scores || []);
    } catch (err) {
      console.error('Erreur chargement activité:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    loadActivity();
  }, [enabled, loadActivity]);

  const updateSubForm = useCallback((field, value) => {
    setSubForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const openSubForm = useCallback(() => { impactHaptic('light'); setShowSubForm(true); }, []);
  const closeSubForm = useCallback(() => setShowSubForm(false), []);
  const resetSubForm = useCallback(() => setSubForm(EMPTY_SUB_FORM), []);

  const handleAddSubActivity = useCallback(async (e) => {
    e.preventDefault();
    if (!subForm.name.trim()) return;
    setSubmittingSub(true);
    try {
      await api.addSubActivity(id, subForm);
      notifyHaptic('success');
      toast.success('Sous-activité ajoutée');
      closeSubForm();
      resetSubForm();
      await loadActivity();
    } catch (err) {
      notifyHaptic('error');
      toast.error(err.message || 'Erreur');
    } finally {
      setSubmittingSub(false);
    }
  }, [id, subForm, toast, closeSubForm, resetSubForm, loadActivity]);

  const performDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await api.deleteActivity(id);
      notifyHaptic('success');
      toast.success('Activité supprimée');
      navigate('/activities');
    } catch (err) {
      notifyHaptic('error');
      toast.error(err.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  }, [id, navigate, toast]);

  const handleDelete = useCallback(async () => {
    const confirmed = await confirmAction(
      `Supprimer l'activité "${activity?.name}" ? Cette action est irréversible.`
    );
    if (confirmed) await performDelete();
  }, [activity?.name, performDelete]);

  const handleDeleteSubActivity = useCallback(async (subId, subName) => {
    const confirmed = await confirmAction(`Supprimer la sous-activité "${subName}" ?`);
    if (!confirmed) return;
    try {
      await api.deleteSubActivity(id, subId);
      notifyHaptic('success');
      toast.success(`Sous-activité "${subName}" supprimée`);
      await loadActivity();
    } catch (err) {
      notifyHaptic('error');
      toast.error(err.message || 'Erreur');
    }
  }, [id, toast, loadActivity]);

  const handleDeleteScore = useCallback(async (scoreId) => {
    const confirmed = await confirmAction('Supprimer ce score ?');
    if (!confirmed) return;
    try {
      await api.deleteScore(scoreId);
      notifyHaptic('success');
      toast.success('Score supprimé');
      await loadActivity();
    } catch (err) {
      notifyHaptic('error');
      toast.error(err.message || 'Erreur');
    }
  }, [toast, loadActivity]);

  return {
    activity, scores, loading,
    activeTab, setActiveTab,
    showSubForm, subForm, submittingSub, deleting,
    openSubForm, closeSubForm, updateSubForm,
    handleAddSubActivity, handleDelete, handleDeleteSubActivity, handleDeleteScore,
  };
}
