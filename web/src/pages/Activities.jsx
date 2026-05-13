import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import * as api from '../api';
import { EmptyState, LoadingSpinner, NoGroupSelected } from '../components';
import { useToast } from '../components/Toast';
import { useGroup } from '../components/GroupContext';
import { TYPE_EMOJIS } from '../constants/activityTypes';

const ACTIVITY_TYPES = [
  { value: 'all', label: 'Toutes', icon: '▦' },
  { value: 'game', label: 'Jeux', icon: TYPE_EMOJIS.game },
  { value: 'sport', label: 'Sport', icon: TYPE_EMOJIS.sport },
  { value: 'education', label: 'Quiz', icon: TYPE_EMOJIS.education },
  { value: 'creative', label: 'Créatif', icon: TYPE_EMOJIS.creative },
  { value: 'other', label: 'Autre', icon: TYPE_EMOJIS.other },
];

const EMPTY_FORM = { name: '', description: '', type: 'game' };

const notifyError = () => {
  globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
};

const impact = (type = 'light') => {
  globalThis.Telegram?.WebApp?.HapticFeedback?.impactOccurred(type);
};

function formatDate(value) {
  if (!value) return 'Date inconnue';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date inconnue' : date.toLocaleDateString('fr-FR');
}

function getTypeLabel(type) {
  return ACTIVITY_TYPES.find(item => item.value === type)?.label || 'Autre';
}

function getActivityStats(activities) {
  const totalScores = activities.reduce((sum, activity) => sum + (activity.stats?.totalSubmissions || 0), 0);
  const totalSubActivities = activities.reduce((sum, activity) => sum + (activity.subActivities?.length || 0), 0);
  const activeActivities = activities.filter(activity => activity.settings?.isActive !== false).length;

  return {
    total: activities.length,
    active: activeActivities,
    scores: totalScores,
    subActivities: totalSubActivities,
  };
}

function filterActivities(activities, search, type) {
  const normalizedSearch = search.trim().toLowerCase();

  return activities.filter(activity => {
    const matchesType = type === 'all' || activity.type === type;
    const haystack = `${activity.name || ''} ${activity.description || ''}`.toLowerCase();
    const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);

    return matchesType && matchesSearch;
  });
}

function ActivitiesHero({ groupName, stats }) {
  return (
    <section className="activities-hero slide-up">
      <div>
        <div className="dashboard-eyebrow">Catalogue</div>
        <h1 className="activities-title">Activités</h1>
        <p className="activities-subtitle">{groupName} · défis, scores et variantes au même endroit.</p>
      </div>
      <div className="activities-hero-meter" aria-label={`${stats.active} activités actives`}>
        <span>Actives</span>
        <strong>{stats.active}</strong>
      </div>
    </section>
  );
}

ActivitiesHero.propTypes = {
  groupName: PropTypes.string.isRequired,
  stats: PropTypes.shape({
    active: PropTypes.number.isRequired,
  }).isRequired,
};

function ActivityMetrics({ stats }) {
  return (
    <section className="metric-strip slide-up-delay-1" aria-label="Résumé des activités">
      <div className="metric-tile metric-tile-score">
        <div className="metric-value">{stats.total}</div>
        <div className="metric-label">Activités</div>
      </div>
      <div className="metric-tile">
        <div className="metric-value">{stats.subActivities}</div>
        <div className="metric-label">Sous-activités</div>
      </div>
      <div className="metric-tile metric-tile-leader">
        <div className="metric-value">{stats.scores}</div>
        <div className="metric-label">Scores</div>
      </div>
    </section>
  );
}

ActivityMetrics.propTypes = {
  stats: PropTypes.shape({
    total: PropTypes.number.isRequired,
    subActivities: PropTypes.number.isRequired,
    scores: PropTypes.number.isRequired,
  }).isRequired,
};

function ActivityForm({ onSubmit, onCancel, submitting }) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const canSubmit = formData.name.trim().length >= 2 && !submitting;

  const update = field => event => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = event => {
    event.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      ...formData,
      name: formData.name.trim(),
      description: formData.description.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="activity-form-panel slide-up">
      <div className="activity-form-header">
        <div>
          <div className="dashboard-eyebrow">Nouvelle activité</div>
          <h2>Créer un terrain de jeu</h2>
        </div>
        <button type="button" className="icon-button" onClick={onCancel} aria-label="Fermer le formulaire">
          ×
        </button>
      </div>

      <label className="form-group" htmlFor="activityName">
        <span className="form-label">Nom</span>
        <input
          id="activityName"
          type="text"
          value={formData.name}
          onChange={update('name')}
          placeholder="Tournoi FIFA, Quiz culture..."
          required
          minLength={2}
          className="form-input"
        />
      </label>

      <label className="form-group" htmlFor="activityDescription">
        <span className="form-label">Description</span>
        <textarea
          id="activityDescription"
          value={formData.description}
          onChange={update('description')}
          placeholder="Ajoute le contexte, les règles ou l'objectif."
          rows={3}
          className="form-textarea"
        />
      </label>

      <fieldset className="activity-type-field">
        <legend>Type</legend>
        <div className="activity-type-grid">
          {ACTIVITY_TYPES.filter(type => type.value !== 'all').map(type => (
            <button
              type="button"
              key={type.value}
              className={`activity-type-option ${formData.type === type.value ? 'active' : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
              aria-pressed={formData.type === type.value}
            >
              <span>{type.icon}</span>
              {type.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
          {submitting ? 'Création...' : 'Créer'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Annuler
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

function ActivityToolbar({ search, type, onSearchChange, onTypeChange, onCreate }) {
  return (
    <section className="activities-toolbar slide-up-delay-1">
      <div className="activity-search-wrap">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          value={search}
          onChange={event => onSearchChange(event.target.value)}
          placeholder="Rechercher une activité"
          aria-label="Rechercher une activité"
        />
      </div>

      <div className="activities-filter-row" aria-label="Filtrer par type">
        {ACTIVITY_TYPES.map(item => (
          <button
            type="button"
            key={item.value}
            className={type === item.value ? 'active' : ''}
            onClick={() => onTypeChange(item.value)}
            aria-pressed={type === item.value}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      <button type="button" className="btn btn-primary" onClick={onCreate}>
        Créer une activité
      </button>
    </section>
  );
}

ActivityToolbar.propTypes = {
  search: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onTypeChange: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
};

function ActivityCard({ activity, onOpen }) {
  const stats = activity.stats || {};
  const subActivitiesCount = activity.subActivities?.length || 0;
  const isActive = activity.settings?.isActive !== false;

  return (
    <button type="button" className="activity-card" onClick={onOpen}>
      <span className="activity-card-icon">{TYPE_EMOJIS[activity.type] || TYPE_EMOJIS.other}</span>
      <span className="activity-card-body">
        <span className="activity-card-meta">
          {getTypeLabel(activity.type)} · {isActive ? 'Active' : 'Inactive'}
        </span>
        <span className="activity-card-title">{activity.name}</span>
        <span className="activity-card-description">
          {activity.description || `Créée le ${formatDate(activity.createdAt)}`}
        </span>
        <span className="activity-card-stats">
          <span>{stats.totalSubmissions || 0} scores</span>
          <span>{stats.totalParticipants || 0} participants</span>
          <span>{subActivitiesCount} variantes</span>
        </span>
      </span>
      <span className="activity-card-arrow" aria-hidden="true">›</span>
    </button>
  );
}

ActivityCard.propTypes = {
  activity: PropTypes.shape({
    _id: PropTypes.string,
    name: PropTypes.string,
    description: PropTypes.string,
    type: PropTypes.string,
    createdAt: PropTypes.string,
    settings: PropTypes.object,
    stats: PropTypes.object,
    subActivities: PropTypes.array,
  }).isRequired,
  onOpen: PropTypes.func.isRequired,
};

function ActivityList({ activities, loading, onOpen }) {
  if (loading) return <LoadingSpinner />;

  if (activities.length === 0) {
    return <EmptyState icon="🎯" text="Aucune activité ne correspond à ces filtres." />;
  }

  return (
    <section className="activities-list slide-up-delay-2" aria-label="Liste des activités">
      {activities.map(activity => (
        <ActivityCard
          key={activity._id}
          activity={activity}
          onOpen={() => onOpen(activity._id)}
        />
      ))}
    </section>
  );
}

ActivityList.propTypes = {
  activities: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  onOpen: PropTypes.func.isRequired,
};

function useActivities(selectedGroupId) {
  const toast = useToast();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const closeForm = useCallback(() => setShowForm(false), []);

  const openForm = useCallback(() => {
    impact('medium');
    setShowForm(true);
  }, []);

  const loadActivities = useCallback(async () => {
    setLoading(true);

    try {
      const data = await api.getActivities({ limit: 100, includeSubActivities: true });
      setActivities(data.activities || []);
    } catch (error) {
      console.error('Erreur chargement activités:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedGroupId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    loadActivities();
  }, [selectedGroupId, loadActivities]);

  const createActivity = useCallback(async formData => {
    setSubmitting(true);

    try {
      await api.createActivity(formData);
      toast.success('Activité créée avec succès.');
      closeForm();
      await loadActivities();
    } catch (error) {
      notifyError();
      toast.error(error.message || "Impossible de créer l'activité.");
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
  const { selectedGroupId, selectedGroup } = useGroup();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');

  const {
    activities,
    loading,
    showForm,
    submitting,
    openForm,
    closeForm,
    createActivity,
  } = useActivities(selectedGroupId);

  const stats = useMemo(() => getActivityStats(activities), [activities]);
  const filteredActivities = useMemo(
    () => filterActivities(activities, search, type),
    [activities, search, type]
  );

  const openActivity = useCallback(activityId => {
    if (!activityId) return;
    navigate(`/activities/${activityId}`);
  }, [navigate]);

  if (!selectedGroupId) return <NoGroupSelected />;

  return (
    <div className="page activities-page">
      <ActivitiesHero groupName={selectedGroup?.title || 'Groupe'} stats={stats} />
      <ActivityMetrics stats={stats} />

      {showForm ? (
        <ActivityForm onSubmit={createActivity} onCancel={closeForm} submitting={submitting} />
      ) : (
        <ActivityToolbar
          search={search}
          type={type}
          onSearchChange={setSearch}
          onTypeChange={setType}
          onCreate={openForm}
        />
      )}

      <ActivityList activities={filteredActivities} loading={loading} onOpen={openActivity} />
    </div>
  );
}
