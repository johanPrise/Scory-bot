import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import * as api from '../api';
import { LoadingSpinner, EmptyState, ListItem, NoGroupSelected } from '../components';
import { useToast } from '../components/Toast';
import { useGroup } from '../components/GroupContext';

const TYPE_EMOJIS = { game: '🎮', sport: '🏋️', education: '📚', creative: '🎨', other: '📌' };

const LABELS = {
  title: 'Activités',
  subtitle: 'Gérez vos activités et défis',
  fieldName: "Nom de l'activité",
  fieldDesc: 'Description',
  fieldType: 'Type',
  namePlaceholder: 'Ex: Tournoi FIFA, Quiz Culture...',
  descPlaceholder: "Décrivez l'activité...",
  submit: 'Créer',
  submitting: '⏳',
  cancel: 'Annuler',
  createBtn: '➕ Créer une activité',
  empty: 'Aucune activité. Créez la première !',
  noDesc: 'Pas de description',
};

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid var(--scory-card-border)',
  background: 'var(--tg-theme-bg-color)',
  color: 'var(--tg-theme-text-color)',
  fontSize: 15, fontFamily: 'inherit', outline: 'none',
};

function ActivityForm({ onSubmit, onCancel, submitting }) {
  const [formData, setFormData] = useState({ name: '', description: '', type: 'game' });
  const update = (field) => (e) => setFormData(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="card card-glow slide-up" style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="actName" style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', display: 'block', marginBottom: 4 }}>
          {LABELS.fieldName}
        </label>
        <input
          id="actName"
          type="text"
          value={formData.name}
          onChange={update('name')}
          placeholder={LABELS.namePlaceholder}
          required
          style={inputStyle}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="actDesc" style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', display: 'block', marginBottom: 4 }}>
          {LABELS.fieldDesc}
        </label>
        <textarea
          id="actDesc"
          value={formData.description}
          onChange={update('description')}
          placeholder={LABELS.descPlaceholder}
          rows={2}
          style={{ ...inputStyle, resize: 'none' }}
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', display: 'block', marginBottom: 8 }}>
            {LABELS.fieldType}
          </legend>
          <div className="chips-row" style={{ marginBottom: 0, paddingBottom: 0 }}>
            {Object.entries(TYPE_EMOJIS).map(([key, emoji]) => (
              <button
                type="button"
                key={key}
                className={`chip ${formData.type === key ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, type: key }))}
              >
                {emoji} {key}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
          {submitting ? LABELS.submitting : '✅'} {LABELS.submit}
        </button>
        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>
          {LABELS.cancel}
        </button>
      </div>
    </form>
  );
}

ActivityForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  submitting: PropTypes.bool.isRequired,
};

function ActivityList({ activities, loading, navigate }) {
  if (loading) return <LoadingSpinner />;
  return (
    <div className="slide-up-delay-1">
      {activities.length > 0 ? (
        activities.map((activity, i) => (
          <ListItem
            key={activity._id || i}
            icon={TYPE_EMOJIS[activity.type] || '📌'}
            title={activity.name}
            subtitle={activity.description || LABELS.noDesc}
            onClick={() => navigate(`/activities/${activity._id}`)}
            trailing={<div style={{ color: 'var(--tg-theme-hint-color)', fontSize: 20 }}>›</div>}
          />
        ))
      ) : (
        <EmptyState icon="🎯" text={LABELS.empty} />
      )}
    </div>
  );
}

ActivityList.propTypes = {
  activities: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  navigate: PropTypes.func.isRequired,
};

function CreateButton({ onClick }) {
  return (
    <button
      className="btn btn-primary slide-up-delay-2"
      style={{ marginTop: 16 }}
      onClick={() => {
        globalThis.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
        onClick();
      }}
    >
      {LABELS.createBtn}
    </button>
  );
}

CreateButton.propTypes = { onClick: PropTypes.func.isRequired };

const triggerErrorHaptic = () => {
  globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
};
function useActivities(selectedGroupId) {
  const toast = useToast();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const closeForm = useCallback(() => {
    setShowForm(false);
  }, []);

  const openForm = useCallback(() => {
    setShowForm(true);
  }, []);

  const resetActivities = useCallback(() => {
    setActivities([]);
    setLoading(false);
  }, []);

  const loadActivities = useCallback(async () => {
    setLoading(true);

    try {
      const data = await api.getActivities();
      setActivities(data.activities || []);
    } catch (err) {
      console.error('Erreur chargement activités:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedGroupId) {
      resetActivities();
      return;
    }

    loadActivities();
  }, [selectedGroupId, loadActivities, resetActivities]);

  const createActivity = useCallback(async (formData) => {
    setSubmitting(true);

    try {
      await api.createActivity(formData);
      toast.success('Activité créée avec succès !');
      closeForm();
      await loadActivities();
    } catch (err) {
      triggerErrorHaptic();
      toast.error(err.message || "Impossible de créer l'activité.");
    } finally {
      setSubmitting(false);
    }
  }, [closeForm, loadActivities, toast]);

  return {
    activities,
    loading,
    showForm,
    submitting,
    openForm,
    closeForm,
    createActivity,
  };
}

export default function Activities() {
  const navigate = useNavigate();
  const { selectedGroupId } = useGroup();

  const {
    activities,
    loading,
    showForm,
    submitting,
    openForm,
    closeForm,
    createActivity,
  } = useActivities(selectedGroupId);

  if (!selectedGroupId) return <NoGroupSelected />;

  return (
    <div className="page">
      <div className="page-header slide-up">
        <h1 className="page-title">{LABELS.title}</h1>
        <div className="page-subtitle">{LABELS.subtitle}</div>
      </div>

      {showForm && (
        <ActivityForm
          onSubmit={createActivity}
          onCancel={closeForm}
          submitting={submitting}
        />
      )}

      <ActivityList activities={activities} loading={loading} navigate={navigate} />

      {!showForm && <CreateButton onClick={openForm} />}
    </div>
  );
}
