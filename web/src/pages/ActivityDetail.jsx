import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from '../api';
import { BackButton, LoadingSpinner, EmptyState, StatCard, ListItem } from '../components';
import { useToast } from '../components/Toast';

export default function ActivityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [activity, setActivity] = useState(null);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [showSubForm, setShowSubForm] = useState(false);
  const [subForm, setSubForm] = useState({ name: '', description: '', maxScore: 100 });
  const [submittingSub, setSubmittingSub] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadActivity = useCallback(async () => {
    try {
      const [actRes, scoresRes] = await Promise.allSettled([
        api.getActivity(id),
        api.getScores({ activityId: id, limit: 20 })
      ]);

      if (actRes.status === 'fulfilled') {
        setActivity(actRes.value.activity || actRes.value);
      }
      if (scoresRes.status === 'fulfilled') {
        setScores(scoresRes.value.scores || []);
      }
    } catch (err) {
      console.error('Erreur chargement activité:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) loadActivity();
  }, [id, loadActivity]);

  const typeEmojis = { game: '🎮', sport: '🏋️', education: '📚', creative: '🎨', other: '📌' };

  const handleAddSubActivity = async (e) => {
    e.preventDefault();
    if (!subForm.name.trim()) return;
    setSubmittingSub(true);
    try {
      await api.addSubActivity(id, subForm);
      globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      toast.success('Sous-activité ajoutée');
      setShowSubForm(false);
      setSubForm({ name: '', description: '', maxScore: 100 });
      loadActivity();
    } catch (err) {
      globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
      toast.error(err.message || 'Erreur');
    } finally {
      setSubmittingSub(false);
    }
  };

  const handleDelete = async () => {
    const tg = globalThis.Telegram?.WebApp;
    if (tg?.showConfirm) {
      tg.showConfirm(
        `Supprimer l'activité "${activity?.name}" ? Cette action est irréversible.`,
        async (confirmed) => {
          if (!confirmed) return;
          await performDelete();
        }
      );
    } else if (globalThis.confirm(`Supprimer l'activité "${activity?.name}" ? Cette action est irréversible.`)) {
      await performDelete();
    }
  };

  const performDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteActivity(id);
      globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      toast.success('Activité supprimée');
      navigate('/activities');
    } catch (err) {
      globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
      toast.error(err.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSubActivity = async (subId, subName) => {
    const tg = globalThis.Telegram?.WebApp;
    const doDelete = async () => {
      try {
        await api.deleteSubActivity(id, subId);
        globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
        toast.success(`Sous-activité "${subName}" supprimée`);
        loadActivity();
      } catch (err) {
        globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
        toast.error(err.message || 'Erreur');
      }
    };

    if (tg?.showConfirm) {
      tg.showConfirm(`Supprimer la sous-activité "${subName}" ?`, async (confirmed) => {
        if (confirmed) await doDelete();
      });
    } else if (globalThis.confirm(`Supprimer la sous-activité "${subName}" ?`)) {
      await doDelete();
    }
  };

  if (loading) return <div className="page"><LoadingSpinner /></div>;

  if (!activity) {
    return (
      <div className="page">
        <EmptyState icon="❌" text="Activité introuvable" />
        <button className="btn btn-secondary" onClick={() => navigate('/activities')}>
          ← Retour aux activités
        </button>
      </div>
    );
  }

  const subActivities = activity.subActivities || [];

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header slide-up">
        <BackButton fallback="/activities" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="list-item-icon" style={{ fontSize: 32 }}>
            {typeEmojis[activity.type] || '📌'}
          </div>
          <div>
            <h1 className="page-title">{activity.name}</h1>
            <div className="page-subtitle">{activity.description || 'Pas de description'}</div>
          </div>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="stats-grid slide-up-delay-1">
        <StatCard value={activity.stats?.totalParticipants || 0} label="Participants" />
        <StatCard value={activity.stats?.totalSubmissions || 0} label="Scores" />
        <StatCard value={activity.stats?.averageScore ? Math.round(activity.stats.averageScore) : '—'} label="Moyenne" />
      </div>

      {/* Action buttons */}
      <div className="slide-up-delay-1" style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={() => navigate(`/add-score?activityId=${id}`)}
        >
          🎯 Ajouter un score
        </button>
        <button
          className="btn btn-secondary"
          style={{ flex: 'none', padding: '10px 14px' }}
          onClick={handleDelete}
          disabled={deleting}
          title="Supprimer l'activité"
        >
          {deleting ? '⏳' : '🗑'}
        </button>
      </div>

      {/* Tabs */}
      <div className="chips-row slide-up-delay-1">
        <button className={`chip ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>
          📋 Info
        </button>
        {subActivities.length > 0 && (
          <button className={`chip ${activeTab === 'sub' ? 'active' : ''}`} onClick={() => setActiveTab('sub')}>
            📦 Sous-activités ({subActivities.length})
          </button>
        )}
        <button className={`chip ${activeTab === 'scores' ? 'active' : ''}`} onClick={() => setActiveTab('scores')}>
          🏅 Scores ({scores.length})
        </button>
      </div>

      {/* Tab content */}
      <div className="slide-up-delay-2">
        {activeTab === 'info' && (
          <div>
            <div className="card">
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 4 }}>Type</div>
                <div style={{ fontWeight: 600 }}>{typeEmojis[activity.type] || '📌'} {activity.type || 'Autre'}</div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 4 }}>Statut</div>
                <div style={{ fontWeight: 600 }}>{activity.settings?.isActive ? '🟢 Active' : '🔴 Inactive'}</div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 4 }}>Créée le</div>
                <div style={{ fontWeight: 600 }}>{new Date(activity.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
              {activity.createdBy && (
                <div>
                  <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 4 }}>Créée par</div>
                  <div style={{ fontWeight: 600 }}>{activity.createdBy.username || activity.createdBy.firstName || '—'}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'sub' && (
          <div>
            {/* Sub-activity creation form */}
            {showSubForm ? (
              <form onSubmit={handleAddSubActivity} className="card card-glow" style={{ marginBottom: 12 }}>
                <div style={{ marginBottom: 10 }}>
                  <label htmlFor="subName" style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', display: 'block', marginBottom: 4 }}>Nom *</label>
                  <input
                    id="subName"
                    type="text"
                    value={subForm.name}
                    onChange={e => setSubForm({ ...subForm, name: e.target.value })}
                    placeholder="Ex: Épreuve 1"
                    required
                    className="form-input"
                  />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label htmlFor="subDesc" style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', display: 'block', marginBottom: 4 }}>Description</label>
                  <input
                    id="subDesc"
                    type="text"
                    value={subForm.description}
                    onChange={e => setSubForm({ ...subForm, description: e.target.value })}
                    placeholder="Description optionnelle"
                    className="form-input"
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label htmlFor="subMaxScore" style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', display: 'block', marginBottom: 4 }}>Score max</label>
                  <input
                    id="subMaxScore"
                    type="number"
                    value={subForm.maxScore}
                    onChange={e => setSubForm({ ...subForm, maxScore: Number(e.target.value) })}
                    min="1"
                    className="form-input"
                  />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submittingSub}>
                    {submittingSub ? '⏳' : '✅'} Ajouter
                  </button>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowSubForm(false)}>
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
              <button
                className="btn btn-secondary"
                style={{ marginBottom: 12 }}
                onClick={() => {
                  globalThis.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
                  setShowSubForm(true);
                }}
              >
                ➕ Ajouter une sous-activité
              </button>
            )}

            {subActivities.length > 0 ? (
              subActivities.map((sub, i) => (
                <ListItem
                  key={sub._id || sub.name || i}
                  icon="📎"
                  title={sub.name}
                  subtitle={sub.description || 'Pas de description'}
                  value={`/${sub.maxScore || 100}`}
                  trailing={
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteSubActivity(sub._id, sub.name); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4, opacity: 0.6 }}
                      title="Supprimer"
                    >
                      🗑
                    </button>
                  }
                />
              ))
            ) : (
              <EmptyState icon="📦" text="Aucune sous-activité" />
            )}
          </div>
        )}

        {activeTab === 'scores' && (
          <div>
            {scores.length > 0 ? (
              scores.map((score, i) => (
                <ListItem
                  key={score._id || i}
                  icon="🎯"
                  title={
                    (score.user?.username || score.user?.firstName || 'Utilisateur') +
                    (score.subActivity ? ` · ${score.subActivity}` : '')
                  }
                  subtitle={
                    new Date(score.createdAt).toLocaleDateString('fr-FR') +
                    (score.team ? ` · ${score.team.name}` : '')
                  }
                  value={`${score.value}/${score.maxPossible}`}
                  trailing={
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const tg = globalThis.Telegram?.WebApp;
                        const doDelete = async () => {
                          try {
                            await api.deleteScore(score._id);
                            tg?.HapticFeedback?.notificationOccurred('success');
                            toast.success('Score supprimé');
                            loadActivity();
                          } catch (err) {
                            tg?.HapticFeedback?.notificationOccurred('error');
                            toast.error(err.message || 'Erreur');
                          }
                        };
                        if (tg?.showConfirm) {
                          tg.showConfirm('Supprimer ce score ?', async (confirmed) => {
                            if (confirmed) await doDelete();
                          });
                        } else if (globalThis.confirm('Supprimer ce score ?')) {
                          await doDelete();
                        }
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4, opacity: 0.6 }}
                      title="Supprimer"
                    >
                      🗑
                    </button>
                  }
                />
              ))
            ) : (
              <EmptyState icon="📋" text="Aucun score pour cette activité" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
