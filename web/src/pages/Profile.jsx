import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';
import { LoadingSpinner, EmptyState, StatCard, ListItem } from '../components';
import { useToast } from '../components/Toast';

export default function Profile() {
  const navigate = useNavigate();
  const toast = useToast();
  const tgUser = globalThis.Telegram?.WebApp?.initDataUnsafe?.user || null;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentScores, setRecentScores] = useState([]);
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState({ firstName: '', lastName: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const [profileRes, scoresRes] = await Promise.allSettled([
        api.getUserProfile(),
        api.getPersonalScores({ limit: 10 })
      ]);

      if (profileRes.status === 'fulfilled') {
        const user = profileRes.value.user || profileRes.value;
        setProfile(user);
        setEditData({ firstName: user.firstName || '', lastName: user.lastName || '' });
      }
      if (scoresRes.status === 'fulfilled') {
        setRecentScores(scoresRes.value.scores || []);
      }
    } catch (err) {
      console.error('Erreur chargement profil:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.updateProfile(editData);
      globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      toast.success('Profil mis à jour');
      setShowEdit(false);
      loadProfile();
    } catch (err) {
      globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Utiliser les données Telegram ou API
  const firstName = profile?.firstName || tgUser?.first_name || 'Utilisateur';
  const lastName = profile?.lastName || tgUser?.last_name || '';
  const username = profile?.username || tgUser?.username || '';
  const initials = (firstName[0] + (lastName[0] || '')).toUpperCase();
  const role = profile?.role || 'user';
  const isLinked = profile?.telegram?.linked || !!tgUser;

  const stats = {
    points: profile?.stats?.totalScore || 0,
    activities: profile?.stats?.completedActivities || 0,
    teams: profile?.teams?.length || 0
  };

  return (
    <div className="page">
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="profile-header slide-up">
            <div className="avatar avatar-lg">{initials}</div>
            <div className="profile-name">{firstName} {lastName}</div>
            {username && <div className="profile-username">@{username}</div>}
            <div className="profile-role">
              {role === 'admin' || role === 'superadmin' ? '👑 Admin' : '👤 Membre'}
            </div>
            {isLinked && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--tg-theme-link-color)' }}>
                ✅ Compte Telegram lié
              </div>
            )}
          </div>

          <div className="stats-grid slide-up-delay-1">
            <StatCard value={stats.points} label="Points" />
            <StatCard value={stats.activities} label="Activités" />
            <StatCard value={stats.teams} label="Équipes" />
          </div>

          {/* Modifier le profil */}
          {showEdit ? (
            <div className="card card-glow slide-up" style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 12 }}>
                <label htmlFor="profileFirstName" style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', display: 'block', marginBottom: 4 }}>Prénom</label>
                <input
                  id="profileFirstName"
                  type="text"
                  value={editData.firstName}
                  onChange={e => setEditData({ ...editData, firstName: e.target.value })}
                  placeholder="Votre prénom"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    border: '1px solid var(--scory-card-border)', background: 'var(--tg-theme-bg-color)',
                    color: 'var(--tg-theme-text-color)', fontSize: 15, fontFamily: 'inherit', outline: 'none'
                  }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="profileLastName" style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', display: 'block', marginBottom: 4 }}>Nom</label>
                <input
                  id="profileLastName"
                  type="text"
                  value={editData.lastName}
                  onChange={e => setEditData({ ...editData, lastName: e.target.value })}
                  placeholder="Votre nom"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    border: '1px solid var(--scory-card-border)', background: 'var(--tg-theme-bg-color)',
                    color: 'var(--tg-theme-text-color)', fontSize: 15, fontFamily: 'inherit', outline: 'none'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveProfile} disabled={saving}>
                  {saving ? '⏳' : '✅'} Sauvegarder
                </button>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowEdit(false)}>
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-secondary slide-up-delay-1"
              style={{ marginBottom: 16 }}
              onClick={() => {
                globalThis.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
                setShowEdit(true);
              }}
            >
              ✏️ Modifier le profil
            </button>
          )}

          {/* Historique des scores */}
          <div className="slide-up-delay-2">
            <div className="section-header">
              <h2 className="section-title">📊 Historique des scores</h2>
            </div>
            {recentScores.length > 0 ? (
              recentScores.map((score, i) => (
                <ListItem
                  key={score._id || i}
                  icon="🎯"
                  title={score.activity?.name || 'Activité'}
                  subtitle={
                    new Date(score.createdAt).toLocaleDateString('fr-FR') +
                    (score.subActivity ? ` · ${score.subActivity}` : '')
                  }
                  value={score.value}
                />
              ))
            ) : (
              <EmptyState icon="📋" text="Aucun score pour le moment" />
            )}
          </div>

          {/* Navigation rapide */}
          <div className="slide-up-delay-3">
            <div className="section-header">
              <h2 className="section-title">Navigation</h2>
            </div>

            <ListItem
              icon="🏆"
              title="Mon classement"
              subtitle="Voir votre position"
              onClick={() => navigate('/rankings')}
              trailing={<div style={{ color: 'var(--tg-theme-hint-color)', fontSize: 20 }}>›</div>}
            />

            <ListItem
              icon="👥"
              title="Mes équipes"
              subtitle="Gérer vos équipes"
              onClick={() => navigate('/teams')}
              trailing={<div style={{ color: 'var(--tg-theme-hint-color)', fontSize: 20 }}>›</div>}
            />

            <ListItem
              icon="📋"
              title="Mes activités"
              subtitle="Voir toutes les activités"
              onClick={() => navigate('/activities')}
              trailing={<div style={{ color: 'var(--tg-theme-hint-color)', fontSize: 20 }}>›</div>}
            />

            <ListItem
              icon="✅"
              title="Approbation"
              subtitle="Scores en attente (admin)"
              onClick={() => navigate('/approval')}
              trailing={<div style={{ color: 'var(--tg-theme-hint-color)', fontSize: 20 }}>›</div>}
            />

            <ListItem
              icon="❓"
              title="Aide"
              subtitle="Comment utiliser Scory"
              onClick={() => navigate('/help')}
              trailing={<div style={{ color: 'var(--tg-theme-hint-color)', fontSize: 20 }}>›</div>}
            />
          </div>

          <div style={{ textAlign: 'center', color: 'var(--tg-theme-hint-color)', fontSize: 12, marginTop: 32 }}>
            Scory v1.0.0
          </div>
        </>
      )}
    </div>
  );
}
