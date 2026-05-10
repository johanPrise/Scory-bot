import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';
import {
  LoadingSpinner,
  EmptyState,
  StatCard,
  ListItem,
  NoGroupSelected,
} from '../components';
import { useToast } from '../components/Toast';
import { useGroup } from '../components/GroupContext';

const TEXT = {
  defaultFirstName: 'Utilisateur',
  defaultGroupName: 'Groupe',
  linkedTelegram: '✅ Compte Telegram lié',
  adminRole: '👑 Admin',
  memberRole: '👤 Membre',
  pointsLabelPrefix: 'Points dans',
  activities: 'Activités',
  teams: 'Équipes',
  firstName: 'Prénom',
  lastName: 'Nom',
  firstNamePlaceholder: 'Votre prénom',
  lastNamePlaceholder: 'Votre nom',
  save: 'Sauvegarder',
  cancel: 'Annuler',
  editProfile: '✏️ Modifier le profil',
  profileUpdated: 'Profil mis à jour',
  profileUpdateError: 'Erreur lors de la mise à jour du profil',
  scoresHistory: '📊 Historique des scores',
  noScore: 'Aucun score pour le moment',
  defaultActivity: 'Activité',
  navigation: 'Navigation',
  rankingTitle: 'Mon classement',
  rankingSubtitle: 'Voir votre position',
  teamsTitle: 'Mes équipes',
  teamsSubtitle: 'Gérer vos équipes',
  activitiesTitle: 'Mes activités',
  activitiesSubtitle: 'Voir toutes les activités',
  approvalTitle: 'Approbation',
  approvalSubtitle: 'Scores en attente (admin)',
  helpTitle: 'Aide',
  helpSubtitle: 'Comment utiliser Scory',
  appVersion: 'Scory v1.0.0',
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--scory-card-border)',
  background: 'var(--tg-theme-bg-color)',
  color: 'var(--tg-theme-text-color)',
  fontSize: 15,
  fontFamily: 'inherit',
  outline: 'none',
};

const labelStyle = {
  fontSize: 13,
  color: 'var(--tg-theme-hint-color)',
  display: 'block',
  marginBottom: 4,
};

const linkedTelegramStyle = {
  marginTop: 8,
  fontSize: 12,
  color: 'var(--tg-theme-link-color)',
};

const trailingStyle = {
  color: 'var(--tg-theme-hint-color)',
  fontSize: 20,
};

const versionStyle = {
  textAlign: 'center',
  color: 'var(--tg-theme-hint-color)',
  fontSize: 12,
  marginTop: 32,
};

const NAVIGATION_ITEMS = [
  {
    icon: '🏆',
    title: TEXT.rankingTitle,
    subtitle: TEXT.rankingSubtitle,
    path: '/rankings',
  },
  {
    icon: '👥',
    title: TEXT.teamsTitle,
    subtitle: TEXT.teamsSubtitle,
    path: '/teams',
  },
  {
    icon: '📋',
    title: TEXT.activitiesTitle,
    subtitle: TEXT.activitiesSubtitle,
    path: '/activities',
  },
  {
    icon: '✅',
    title: TEXT.approvalTitle,
    subtitle: TEXT.approvalSubtitle,
    path: '/approval',
  },
  {
    icon: '❓',
    title: TEXT.helpTitle,
    subtitle: TEXT.helpSubtitle,
    path: '/help',
  },
];

function getTelegramUser() {
  return globalThis.Telegram?.WebApp?.initDataUnsafe?.user || null;
}

function triggerTelegramNotification(type) {
  globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
}

function triggerTelegramImpact() {
  globalThis.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
}

function getUserFromProfileResponse(response) {
  return response.user || response;
}

function getInitials(firstName, lastName) {
  const firstInitial = firstName?.[0] || '';
  const lastInitial = lastName?.[0] || '';

  return `${firstInitial}${lastInitial}`.toUpperCase();
}

function isAdminRole(role) {
  const adminRoles = ['admin', 'superadmin'];

  return adminRoles.includes(role);
}

function getRoleLabel(role) {
  if (isAdminRole(role)) {
    return TEXT.adminRole;
  }

  return TEXT.memberRole;
}

function isTelegramLinked(profile, tgUser) {
  if (tgUser) {
    return true;
  }

  return Boolean(profile?.telegram?.linked);
}

function getProp(first, second, fallback = '') {
  return first || second || fallback;
}

function getDisplayProfile(profile, tgUser) {
  const firstName = getProp(profile?.firstName, tgUser?.first_name, TEXT.defaultFirstName);
  const lastName = getProp(profile?.lastName, tgUser?.last_name);
  const username = getProp(profile?.username, tgUser?.username);
  const role = profile?.role || 'user';

  return {
    firstName,
    lastName,
    username,
    role,
    initials: getInitials(firstName, lastName),
    isLinked: isTelegramLinked(profile, tgUser),
  };
}

function getStats(profile) {
  return {
    points: profile?.stats?.totalScore || 0,
    activities: profile?.stats?.completedActivities || 0,
    teams: profile?.teams?.length || 0,
  };
}

function getScoreSubtitle(score) {
  const date = new Date(score.createdAt).toLocaleDateString('fr-FR');

  if (score.subActivity) {
    return `${date} · ${score.subActivity}`;
  }

  return date;
}

function ProfileHeader({ user }) {
  return (
    <div className="profile-header slide-up">
      <div className="avatar avatar-lg">{user.initials}</div>

      <div className="profile-name">
        {user.firstName} {user.lastName}
      </div>

      {user.username && (
        <div className="profile-username">@{user.username}</div>
      )}

      <div className="profile-role">{getRoleLabel(user.role)}</div>

      {user.isLinked && (
        <div style={linkedTelegramStyle}>{TEXT.linkedTelegram}</div>
      )}
    </div>
  );
}

ProfileHeader.propTypes = {
  user: PropTypes.shape({
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    username: PropTypes.string,
    role: PropTypes.string,
    initials: PropTypes.string,
    isLinked: PropTypes.bool,
  }).isRequired,
};

function ProfileStats({ stats, groupName }) {
  return (
    <div className="stats-grid slide-up-delay-1">
      <StatCard value={stats.points} label={`${TEXT.pointsLabelPrefix} ${groupName}`} />
      <StatCard value={stats.activities} label={TEXT.activities} />
      <StatCard value={stats.teams} label={TEXT.teams} />
    </div>
  );
}

ProfileStats.propTypes = {
  stats: PropTypes.shape({
    points: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    activities: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    teams: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  groupName: PropTypes.string,
};

function TextInputField({ id, label, value, placeholder, onChange }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>

      <input
        id={id}
        type="text"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );
}

TextInputField.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

function EditProfileForm({
  editData,
  saving,
  onChange,
  onSave,
  onCancel,
}) {
  return (
    <div className="card card-glow slide-up" style={{ marginBottom: 16 }}>
      <TextInputField
        id="profileFirstName"
        label={TEXT.firstName}
        value={editData.firstName}
        placeholder={TEXT.firstNamePlaceholder}
        onChange={value => onChange('firstName', value)}
      />

      <TextInputField
        id="profileLastName"
        label={TEXT.lastName}
        value={editData.lastName}
        placeholder={TEXT.lastNamePlaceholder}
        onChange={value => onChange('lastName', value)}
      />

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={onSave}
          disabled={saving}
        >
          {saving ? '⏳' : '✅'} {TEXT.save}
        </button>

        <button
          className="btn btn-secondary"
          style={{ flex: 1 }}
          onClick={onCancel}
        >
          {TEXT.cancel}
        </button>
      </div>
    </div>
  );
}

EditProfileForm.propTypes = {
  editData: PropTypes.shape({
    firstName: PropTypes.string,
    lastName: PropTypes.string,
  }).isRequired,
  saving: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

function EditProfileButton({ onClick }) {
  return (
    <button
      className="btn btn-secondary slide-up-delay-1"
      style={{ marginBottom: 16 }}
      onClick={onClick}
    >
      {TEXT.editProfile}
    </button>
  );
}

EditProfileButton.propTypes = {
  onClick: PropTypes.func.isRequired,
};

function ProfileEditor({
  showEdit,
  editData,
  saving,
  onChange,
  onSave,
  onCancel,
  onOpen,
}) {
  if (showEdit) {
    return (
      <EditProfileForm
        editData={editData}
        saving={saving}
        onChange={onChange}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
  }

  return <EditProfileButton onClick={onOpen} />;
}

ProfileEditor.propTypes = {
  showEdit: PropTypes.bool.isRequired,
  editData: PropTypes.object,
  saving: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onOpen: PropTypes.func.isRequired,
};

function ScoresHistory({ scores }) {
  return (
    <div className="slide-up-delay-2">
      <div className="section-header">
        <h2 className="section-title">{TEXT.scoresHistory}</h2>
      </div>

      {scores.length > 0 ? (
        scores.map((score, index) => (
          <ListItem
            key={score._id || index}
            icon="🎯"
            title={score.activity?.name || TEXT.defaultActivity}
            subtitle={getScoreSubtitle(score)}
            value={score.value}
          />
        ))
      ) : (
        <EmptyState icon="📋" text={TEXT.noScore} />
      )}
    </div>
  );
}

ScoresHistory.propTypes = {
  scores: PropTypes.array.isRequired,
};

function NavigationTrailing() {
  return <div style={trailingStyle}>›</div>;
}

function QuickNavigation({ onNavigate }) {
  return (
    <div className="slide-up-delay-3">
      <div className="section-header">
        <h2 className="section-title">{TEXT.navigation}</h2>
      </div>

      {NAVIGATION_ITEMS.map(item => (
        <ListItem
          key={item.path}
          icon={item.icon}
          title={item.title}
          subtitle={item.subtitle}
          onClick={() => onNavigate(item.path)}
          trailing={<NavigationTrailing />}
        />
      ))}
    </div>
  );
}

QuickNavigation.propTypes = {
  onNavigate: PropTypes.func.isRequired,
};

function VersionFooter() {
  return <div style={versionStyle}>{TEXT.appVersion}</div>;
}

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

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentScores, setRecentScores] = useState([]);
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState({ firstName: '', lastName: '' });
  const [saving, setSaving] = useState(false);

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
    if (!selectedGroupId) {
      return;
    }

    loadProfile();
  }, [selectedGroupId, loadProfile]);

  const displayProfile = useMemo(() => {
    return getDisplayProfile(profile, tgUser);
  }, [profile, tgUser]);

  const stats = useMemo(() => {
    return getStats(profile);
  }, [profile]);

  const groupName = selectedGroup?.title || TEXT.defaultGroupName;

  const handleEditChange = useCallback((field, value) => {
    setEditData(currentData => ({
      ...currentData,
      [field]: value,
    }));
  }, []);

  const openEditForm = useCallback(() => {
    triggerTelegramImpact();
    setShowEdit(true);
  }, []);

  const closeEditForm = useCallback(() => {
    setShowEdit(false);
  }, []);

  const handleSaveProfile = useCallback(async () => {
    setSaving(true);

    try {
      await api.updateProfile(editData);

      triggerTelegramNotification('success');
      toast.success(TEXT.profileUpdated);
      setShowEdit(false);

      await loadProfile();
    } catch (error) {
      triggerTelegramNotification('error');
      toast.error(error.message || TEXT.profileUpdateError);
    } finally {
      setSaving(false);
    }
  }, [editData, loadProfile, toast]);

  if (!selectedGroupId) {
    return <NoGroupSelected />;
  }

  if (loading) {
    return <PageLoading />;
  }

  return (
    <div className="page">
      <ProfileHeader user={displayProfile} />

      <ProfileStats stats={stats} groupName={groupName} />

      <ProfileEditor
        showEdit={showEdit}
        editData={editData}
        saving={saving}
        onChange={handleEditChange}
        onSave={handleSaveProfile}
        onCancel={closeEditForm}
        onOpen={openEditForm}
      />

      <ScoresHistory scores={recentScores} />

      <QuickNavigation onNavigate={navigate} />

      <VersionFooter />
    </div>
  );
}