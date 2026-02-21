import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';
import { LoadingSpinner, EmptyState, ListItem } from '../components';
import { useToast } from '../components/Toast';

export default function Activities() {
  const navigate = useNavigate();
  const toast = useToast();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', type: 'game' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const data = await api.getActivities();
      setActivities(data.activities || []);
    } catch (err) {
      console.error('Erreur chargement activités:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSubmitting(true);
    try {
      await api.createActivity(formData);
      
      toast.success('Activité créée avec succès !');
      
      setShowForm(false);
      setFormData({ name: '', description: '', type: 'game' });
      loadActivities();
    } catch (err) {
      const tg = globalThis.Telegram?.WebApp;
      tg?.HapticFeedback?.notificationOccurred('error');
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const typeEmojis = { game: '🎮', sport: '🏋️', education: '📚', creative: '🎨', other: '📌' };

  return (
    <div className="page">
      <div className="page-header slide-up">
        <h1 className="page-title">Activités</h1>
        <div className="page-subtitle">Gérez vos activités et défis</div>
      </div>

      {/* Formulaire de création */}
      {showForm && (
        <form onSubmit={handleCreate} className="card card-glow slide-up" style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="actName" style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', display: 'block', marginBottom: 4 }}>Nom de l'activité</label>
            <input
              id="actName"
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Tournoi FIFA, Quiz Culture..."
              required
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid var(--scory-card-border)',
                background: 'var(--tg-theme-bg-color)',
                color: 'var(--tg-theme-text-color)',
                fontSize: 15, fontFamily: 'inherit', outline: 'none'
              }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="actDesc" style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', display: 'block', marginBottom: 4 }}>Description</label>
            <textarea
              id="actDesc"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Décrivez l'activité..."
              rows={2}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8, resize: 'none',
                border: '1px solid var(--scory-card-border)',
                background: 'var(--tg-theme-bg-color)',
                color: 'var(--tg-theme-text-color)',
                fontSize: 15, fontFamily: 'inherit', outline: 'none'
              }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', display: 'block', marginBottom: 8 }}>Type</legend>
            <div className="chips-row" style={{ marginBottom: 0, paddingBottom: 0 }}>
              {Object.entries(typeEmojis).map(([key, emoji]) => (
                <button
                  type="button"
                  key={key}
                  className={`chip ${formData.type === key ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, type: key })}
                >
                  {emoji} {key}
                </button>
              ))}
            </div>
            </fieldset>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
              {submitting ? '⏳' : '✅'} Créer
            </button>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowForm(false)}>
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Liste des activités */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="slide-up-delay-1">
          {activities.length > 0 ? (
            activities.map((activity, i) => (
              <ListItem
                key={activity._id || i}
                icon={typeEmojis[activity.type] || '📌'}
                title={activity.name}
                subtitle={activity.description || 'Pas de description'}
                onClick={() => navigate(`/activities/${activity._id}`)}
                trailing={<div style={{ color: 'var(--tg-theme-hint-color)', fontSize: 20 }}>›</div>}
              />
            ))
          ) : (
            <EmptyState icon="🎯" text="Aucune activité. Créez la première !" />
          )}
        </div>
      )}

      {!showForm && (
        <button
          className="btn btn-primary slide-up-delay-2"
          style={{ marginTop: 16 }}
          onClick={() => {
            const tg = globalThis.Telegram?.WebApp;
            tg?.HapticFeedback?.impactOccurred('medium');
            setShowForm(true);
          }}
        >
          ➕ Créer une activité
        </button>
      )}
    </div>
  );
}
