import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as api from '../api';
import { BackButton, LoadingSpinner, EmptyState } from '../components';
import { useToast } from '../components/Toast';
import { useGroup } from '../components/GroupContext';

export default function AddScore() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const preselectedActivity = searchParams.get('activityId') || '';
  const { selectedGroupId } = useGroup();

  const [activities, setActivities] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    activityId: preselectedActivity,
    subActivity: '',
    value: '',
    maxPossible: '100',
    context: 'individual',
    teamId: '',
    comments: '',
  });

  const [selectedActivity, setSelectedActivity] = useState(null);

  useEffect(() => {
    loadData();
  }, [selectedGroupId]);

  useEffect(() => {
    if (form.activityId && activities.length) {
      const act = activities.find(a => a._id === form.activityId);
      setSelectedActivity(act || null);
    } else {
      setSelectedActivity(null);
    }
  }, [form.activityId, activities]);

  const loadData = async () => {
    try {
      const [actRes, teamRes] = await Promise.allSettled([
        api.getActivities({ limit: 100, includeSubActivities: 'true' }),
        api.getTeams()
      ]);
      if (actRes.status === 'fulfilled') setActivities(actRes.value.activities || []);
      if (teamRes.status === 'fulfilled') setTeams(teamRes.value.teams || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.activityId || !form.value || !form.maxPossible || !form.context) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        activityId: form.activityId,
        value: Number(form.value),
        maxPossible: Number(form.maxPossible),
        context: form.context,
        comments: form.comments || undefined,
      };

      if (form.subActivity) payload.subActivity = form.subActivity;
      if (form.context === 'team' && form.teamId) payload.teamId = form.teamId;
      // For individual, we auto-assign the current user on the backend

      await api.addScore(payload);
      globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      toast.success('Score ajouté avec succès !');
      setTimeout(() => navigate(-1), 800);
    } catch (err) {
      globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
      toast.error(err.message || 'Erreur lors de l\'ajout du score');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid var(--scory-card-border)',
    background: 'var(--tg-theme-bg-color)',
    color: 'var(--tg-theme-text-color)',
    fontSize: 15, fontFamily: 'inherit', outline: 'none'
  };

  const labelStyle = {
    fontSize: 13, color: 'var(--tg-theme-hint-color)',
    display: 'block', marginBottom: 4
  };

  if (loading) return <div className="page"><LoadingSpinner /></div>;

  return (
    <div className="page">
      <div className="page-header slide-up">
        <BackButton fallback="/activities" />
        <h1 className="page-title">Ajouter un score</h1>
        <div className="page-subtitle">Enregistrez un nouveau score</div>
      </div>

      <form onSubmit={handleSubmit} className="slide-up-delay-1">
        {/* Activité */}
        <div className="card" style={{ marginBottom: 12 }}>
          <label htmlFor="activityId" style={labelStyle}>Activité *</label>
          <select
            id="activityId"
            value={form.activityId}
            onChange={e => setForm({ ...form, activityId: e.target.value, subActivity: '' })}
            required
            style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none' }}
          >
            <option value="">— Choisir une activité —</option>
            {activities.map(a => (
              <option key={a._id} value={a._id}>{a.name}</option>
            ))}
          </select>
        </div>

        {/* Sous-activité (si disponible) */}
        {selectedActivity?.subActivities?.length > 0 && (
          <div className="card" style={{ marginBottom: 12 }}>
            <label htmlFor="subActivity" style={labelStyle}>Sous-activité</label>
            <select
              id="subActivity"
              value={form.subActivity}
              onChange={e => setForm({ ...form, subActivity: e.target.value })}
              style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none' }}
            >
              <option value="">— Aucune —</option>
              {selectedActivity.subActivities.map(sub => (
                <option key={sub.name} value={sub.name}>{sub.name} (/{sub.maxScore || 100})</option>
              ))}
            </select>
          </div>
        )}

        {/* Contexte */}
        <div className="card" style={{ marginBottom: 12 }}>
          <label style={labelStyle} id="context-label">Contexte *</label>
          <div className="chips-row" style={{ marginBottom: 0, paddingBottom: 0 }} role="group" aria-labelledby="context-label">
            <button
              type="button"
              className={`chip ${form.context === 'individual' ? 'active' : ''}`}
              onClick={() => setForm({ ...form, context: 'individual', teamId: '' })}
            >
              👤 Individuel
            </button>
            <button
              type="button"
              className={`chip ${form.context === 'team' ? 'active' : ''}`}
              onClick={() => setForm({ ...form, context: 'team' })}
            >
              👥 Équipe
            </button>
          </div>
        </div>

        {/* Équipe (si contexte team) */}
        {form.context === 'team' && (
          <div className="card" style={{ marginBottom: 12 }}>
            <label htmlFor="teamId" style={labelStyle}>Équipe *</label>
            {teams.length > 0 ? (
              <select
                id="teamId"
                value={form.teamId}
                onChange={e => setForm({ ...form, teamId: e.target.value })}
                required
                style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none' }}
              >
                <option value="">— Choisir une équipe —</option>
                {teams.map(t => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            ) : (
              <EmptyState icon="👥" text="Aucune équipe disponible" />
            )}
          </div>
        )}

        {/* Score */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="scoreValue" style={labelStyle}>Score *</label>
              <input
                id="scoreValue"
                type="number"
                value={form.value}
                onChange={e => setForm({ ...form, value: e.target.value })}
                placeholder="0"
                min="0"
                required
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="maxPossible" style={labelStyle}>Score max *</label>
              <input
                id="maxPossible"
                type="number"
                value={form.maxPossible}
                onChange={e => setForm({ ...form, maxPossible: e.target.value })}
                placeholder="100"
                min="1"
                required
                style={inputStyle}
              />
            </div>
          </div>
          {form.value && form.maxPossible && (
            <div style={{
              textAlign: 'center', marginTop: 10, padding: '8px 0',
              fontSize: 14, color: 'var(--tg-theme-hint-color)'
            }}>
              Score normalisé : <strong style={{ color: 'var(--tg-theme-accent-text-color)' }}>
                {((Number(form.value) / Number(form.maxPossible)) * 100).toFixed(1)}%
              </strong>
            </div>
          )}
        </div>

        {/* Commentaires */}
        <div className="card" style={{ marginBottom: 16 }}>
          <label htmlFor="comments" style={labelStyle}>Commentaires</label>
          <textarea
            id="comments"
            value={form.comments}
            onChange={e => setForm({ ...form, comments: e.target.value })}
            placeholder="Notes, remarques..."
            rows={2}
            style={{ ...inputStyle, resize: 'none' }}
          />
        </div>

        {/* Submit */}
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? '⏳ Envoi...' : '✅ Ajouter le score'}
        </button>
      </form>
    </div>
  );
}
