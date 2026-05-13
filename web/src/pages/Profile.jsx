import PropTypes from 'prop-types';
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState, LoadingSpinner, NoGroupSelected } from '../components';
import { useGroup } from '../components/GroupContext';
import { useToast } from '../components/Toast';
import { useProfileData } from '../hooks/useProfileData';

const NAVIGATION_ITEMS = [
  { icon: '🏆', title: 'Scoreboard', subtitle: 'Votre position dans le groupe', path: '/rankings' },
  { icon: '👥', title: 'Équipes', subtitle: 'Collectifs et codes invitation', path: '/teams' },
  { icon: '▦', title: 'Activités', subtitle: 'Défis, variantes et scores', path: '/activities' },
  { icon: '✓', title: 'Approbation', subtitle: 'Scores en attente pour les admins', path: '/approval' },
  { icon: '?', title: 'Aide', subtitle: 'Guide rapide de Scory', path: '/help' },
];

function getTelegramUser() {
  return globalThis.Telegram?.WebApp?.initDataUnsafe?.user || null;
}

function notify(type) {
  globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
}

function impact() {
  globalThis.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
}

function getInitials(firstName, lastName) {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';
}

function isAdmin(role) {
  return ['admin', 'superadmin'].includes(role);
}

function getDisplayProfile(profile, tgUser) {
  const firstName = profile?.firstName || tgUser?.first_name || 'Utilisateur';
  const lastName = profile?.lastName || tgUser?.last_name || '';
  const username = profile?.username || tgUser?.username || '';
  const role = profile?.role || 'user';

  return {
    firstName,
    lastName,
    username,
    role,
    initials: getInitials(firstName, lastName),
    isLinked: Boolean(tgUser || profile?.telegram?.linked),
  };
}

function getStats(profile = {}) {
  const { stats = {}, teams = [] } = profile || {};

  return {
    points: stats.totalScore || 0,
    activities: stats.completedActivities || 0,
    teams: teams.length,
  };
}

function formatScoreDate(score) {
  const date = new Date(score.createdAt);
  const formatted = Number.isNaN(date.getTime()) ? 'Date inconnue' : date.toLocaleDateString('fr-FR');
  return score.subActivity ? `${formatted} · ${score.subActivity}` : formatted;
}

function ProfileHero({ user, groupName }) {
  return (
    <section className="profile-hero-v2 slide-up">
      <div className="profile-avatar-v2">{user.initials}</div>
      <div className="profile-hero-copy">
        <div className="dashboard-eyebrow">{groupName}</div>
        <h1>{user.firstName} {user.lastName}</h1>
        {user.username && <p>@{user.username}</p>}
        <div className="profile-badge-row">
          <span>{isAdmin(user.role) ? 'Admin' : 'Membre'}</span>
          {user.isLinked && <span>Telegram lié</span>}
        </div>
      </div>
    </section>
  );
}

ProfileHero.propTypes = {
  user: PropTypes.shape({
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    username: PropTypes.string,
    role: PropTypes.string,
    initials: PropTypes.string,
    isLinked: PropTypes.bool,
  }).isRequired,
  groupName: PropTypes.string.isRequired,
};

function ProfileStats({ stats }) {
  return (
    <section className="metric-strip slide-up-delay-1" aria-label="Statistiques du profil">
      <div className="metric-tile metric-tile-score">
        <div className="metric-value">{stats.points}</div>
        <div className="metric-label">Points</div>
      </div>
      <div className="metric-tile">
        <div className="metric-value">{stats.activities}</div>
        <div className="metric-label">Activités</div>
      </div>
      <div className="metric-tile metric-tile-leader">
        <div className="metric-value">{stats.teams}</div>
        <div className="metric-label">Équipes</div>
      </div>
    </section>
  );
}

ProfileStats.propTypes = {
  stats: PropTypes.shape({
    points: PropTypes.number.isRequired,
    activities: PropTypes.number.isRequired,
    teams: PropTypes.number.isRequired,
  }).isRequired,
};

function ProfileEditor({ showEdit, editData, saving, onChange, onSave, onCancel, onOpen }) {
  if (!showEdit) {
    return (
      <button type="button" className="btn btn-secondary profile-edit-button-v2 slide-up-delay-1" onClick={onOpen}>
        Modifier le profil
      </button>
    );
  }

  return (
    <section className="profile-edit-panel slide-up">
      <div className="profile-edit-header">
        <div>
          <div className="dashboard-eyebrow">Identité</div>
          <h2>Modifier le profil</h2>
        </div>
        <button type="button" className="icon-button" onClick={onCancel} aria-label="Fermer l'édition du profil">
          ×
        </button>
      </div>

      <label className="form-group" htmlFor="profileFirstName">
        <span className="form-label">Prénom</span>
        <input
          id="profileFirstName"
          type="text"
          className="form-input"
          value={editData.firstName}
          onChange={event => onChange('firstName', event.target.value)}
          placeholder="Votre prénom"
        />
      </label>

      <label className="form-group" htmlFor="profileLastName">
        <span className="form-label">Nom</span>
        <input
          id="profileLastName"
          type="text"
          className="form-input"
          value={editData.lastName}
          onChange={event => onChange('lastName', event.target.value)}
          placeholder="Votre nom"
        />
      </label>

      <div className="form-actions">
        <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}>
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </section>
  );
}

ProfileEditor.propTypes = {
  showEdit: PropTypes.bool.isRequired,
  editData: PropTypes.shape({
    firstName: PropTypes.string,
    lastName: PropTypes.string,
  }).isRequired,
  saving: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onOpen: PropTypes.func.isRequired,
};

function ScoreHistoryCard({ score }) {
  return (
    <article className="profile-score-card">
      <div className="profile-score-icon">🎯</div>
      <div className="profile-score-body">
        <h2>{score.activity?.name || 'Activité'}</h2>
        <p>{formatScoreDate(score)}</p>
      </div>
      <div className="profile-score-value">{score.value}</div>
    </article>
  );
}

ScoreHistoryCard.propTypes = {
  score: PropTypes.object.isRequired,
};

function ScoresHistory({ scores }) {
  return (
    <section className="profile-section slide-up-delay-2">
      <div className="section-header">
        <h2 className="section-title">Historique des scores</h2>
      </div>

      {scores.length > 0 ? (
        <div className="profile-score-list">
          {scores.map((score, index) => (
            <ScoreHistoryCard key={score._id || index} score={score} />
          ))}
        </div>
      ) : (
        <EmptyState icon="📋" text="Aucun score pour le moment." />
      )}
    </section>
  );
}

ScoresHistory.propTypes = {
  scores: PropTypes.array.isRequired,
};

function QuickNavigation({ onNavigate }) {
  return (
    <section className="profile-section slide-up-delay-3">
      <div className="section-header">
        <h2 className="section-title">Navigation</h2>
      </div>
      <div className="profile-nav-grid">
        {NAVIGATION_ITEMS.map(item => (
          <button type="button" className="profile-nav-card" key={item.path} onClick={() => onNavigate(item.path)}>
            <span className="profile-nav-icon">{item.icon}</span>
            <span className="profile-nav-body">
              <strong>{item.title}</strong>
              <small>{item.subtitle}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

QuickNavigation.propTypes = {
  onNavigate: PropTypes.func.isRequired,
};

function PageLoading() {
  return (
    <div className="page">
      <LoadingSpinner />
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const toast = useToast();
  const { selectedGroupId, selectedGroup } = useGroup();
  const tgUser = useMemo(() => getTelegramUser(), []);
  const {
    profile,
    loading,
    recentScores,
    showEdit,
    setShowEdit,
    editData,
    saving,
    handleEditChange,
    handleSaveProfile,
  } = useProfileData(selectedGroupId, toast, notify);

  const displayProfile = useMemo(() => getDisplayProfile(profile, tgUser), [profile, tgUser]);
  const stats = useMemo(() => getStats(profile), [profile]);
  const groupName = selectedGroup?.title || 'Groupe';

  const openEditForm = useCallback(() => {
    impact();
    setShowEdit(true);
  }, [setShowEdit]);

  const closeEditForm = useCallback(() => {
    setShowEdit(false);
  }, [setShowEdit]);

  const saveProfile = useCallback(() => {
    handleSaveProfile('Profil mis à jour.');
  }, [handleSaveProfile]);

  if (!selectedGroupId) return <NoGroupSelected />;
  if (loading) return <PageLoading />;

  return (
    <div className="page profile-page-v2">
      <ProfileHero user={displayProfile} groupName={groupName} />
      <ProfileStats stats={stats} />
      <ProfileEditor
        showEdit={showEdit}
        editData={editData}
        saving={saving}
        onChange={handleEditChange}
        onSave={saveProfile}
        onCancel={closeEditForm}
        onOpen={openEditForm}
      />
      <ScoresHistory scores={recentScores} />
      <QuickNavigation onNavigate={navigate} />
      <footer className="profile-footer">Scory v1.0.0</footer>
    </div>
  );
}
