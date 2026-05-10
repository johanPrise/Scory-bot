import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from '../api';
import { useToast } from '../components/Toast';
import { useGroup } from '../components/GroupContext';
import { NoGroupSelected, LoadingSpinner } from '../components';

const INITIAL_TEAM_DATA = {
  team: null,
  members: [],
  stats: null,
  loading: true,
};

function getTeamFromResponse(response) {
  return response?.team || response || null;
}

function getMembersFromResponse(response) {
  return response?.members || [];
}

function getStatsFromResponse(response) {
  return response?.stats || response || null;
}

function getFulfilledValue(result) {
  return result.status === 'fulfilled' ? result.value : null;
}

function normalizeTeamResults(results) {
  const [teamResult, membersResult, statsResult] = results;

  return {
    team: getTeamFromResponse(getFulfilledValue(teamResult)),
    members: getMembersFromResponse(getFulfilledValue(membersResult)),
    stats: getStatsFromResponse(getFulfilledValue(statsResult)),
    loading: false,
  };
}

function useTeamData(teamId, enabled) {
  const [data, setData] = useState(INITIAL_TEAM_DATA);

  const loadTeam = useCallback(async () => {
    setData((current) => ({ ...current, loading: true }));

    try {
      const results = await Promise.allSettled([
        api.getTeam(teamId),
        api.getTeamMembers(teamId),
        api.getTeamStats(teamId),
      ]);

      setData(normalizeTeamResults(results));
    } catch (err) {
      console.error('Erreur chargement équipe:', err);
      setData((current) => ({ ...current, loading: false }));
    }
  }, [teamId]);

  useEffect(() => {
    if (!enabled) {
      setData({ ...INITIAL_TEAM_DATA, loading: false });
      return;
    }

    loadTeam();
  }, [enabled, loadTeam]);

  return data;
}

function getDeleteMessage(teamName) {
  return `Supprimer l'équipe "${teamName || 'cette équipe'}" ? Cette action est irréversible.`;
}

function useDeleteTeam({ teamId, teamName, navigate, toast }) {
  const [deleting, setDeleting] = useState(false);

  const deleteTeam = useCallback(() => {
    return executeTeamDeletion({
      teamId,
      navigate,
      toast,
      setDeleting,
    });
  }, [teamId, navigate, toast]);

  const confirmDelete = useCallback(() => {
    requestTeamDeleteConfirmation({
      teamName,
      onConfirm: deleteTeam,
    });
  }, [teamName, deleteTeam]);

  return {
    deleting,
    confirmDelete,
  };
}
function getJoinCode(team) {
  return team?.settings?.joinCode || '';
}

function useJoinCode(team) {
  const joinCode = getJoinCode(team);

  const copyJoinCode = useCallback(() => {
    if (!joinCode) return;

    navigator.clipboard?.writeText(joinCode);
    globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
  }, [joinCode]);

  return {
    joinCode,
    copyJoinCode,
  };
}

function canLoadTeam(id, selectedGroupId) {
  return Boolean(id) && Boolean(selectedGroupId);
}

function getTeamName(team) {
  return team ? team.name : '';
}

function getTeamDetailViewState(selectedGroupId, loading, team) {
  if (!selectedGroupId) return 'no-group';
  if (loading) return 'loading';
  if (!team) return 'not-found';

  return 'ready';
}

function createTeamDetailModel({
  navigate,
  groupContext,
  teamData,
  deleteTeam,
  joinCode,
  activeTab,
  setActiveTab,
}) {
  return {
    viewState: getTeamDetailViewState(
      groupContext.selectedGroupId,
      teamData.loading,
      teamData.team
    ),
    team: teamData.team,
    members: teamData.members,
    stats: teamData.stats,
    selectedGroup: groupContext.selectedGroup,
    activeTab,
    setActiveTab,
    navigate,
    deleting: deleteTeam.deleting,
    confirmDelete: deleteTeam.confirmDelete,
    joinCode: joinCode.joinCode,
    copyJoinCode: joinCode.copyJoinCode,
  };
}

function useTeamDetailModel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const groupContext = useGroup();

  const teamData = useTeamData(id, canLoadTeam(id, groupContext.selectedGroupId));

  const deleteTeam = useDeleteTeam({
    teamId: id,
    teamName: getTeamName(teamData.team),
    navigate,
    toast,
  });

  const joinCode = useJoinCode(teamData.team);
  const [activeTab, setActiveTab] = useState('members');

  return createTeamDetailModel({
    id,
    navigate,
    groupContext,
    teamData,
    deleteTeam,
    joinCode,
    activeTab,
    setActiveTab,
  });
}

function getActivitiesCount(stats) {
  return stats ? stats.activitiesCount || 0 : 0;
}

function getGroupName(selectedGroup) {
  return selectedGroup ? selectedGroup.title || 'Groupe' : 'Groupe';
}

function getTeamSummary({ team, members, stats, selectedGroup }) {
  return {
    memberCount: getMemberCount(team, members),
    totalScore: getTotalScore(team, stats),
    activitiesCount: getActivitiesCount(stats),
    groupName: getGroupName(selectedGroup),
  };
}

function TeamDetailReady({
  team,
  members,
  stats,
  selectedGroup,
  activeTab,
  setActiveTab,
  onBack,
  deleting,
  confirmDelete,
  joinCode,
  copyJoinCode,
}) {
  const summary = getTeamSummary({ team, members, stats, selectedGroup });

  return (
    <div className="page">
      <TeamHeader team={team} onBack={onBack} />

      <TeamStats
        memberCount={summary.memberCount}
        totalScore={summary.totalScore}
        activitiesCount={summary.activitiesCount}
        groupName={summary.groupName}
      />

      <JoinCodeCard joinCode={joinCode} onCopy={copyJoinCode} />

      <DeleteTeamButton deleting={deleting} onDelete={confirmDelete} />

      <TeamTabs activeTab={activeTab} memberCount={summary.memberCount} onTabChange={setActiveTab} />

      <TeamTabContent
        activeTab={activeTab}
        members={members}
        team={team}
        memberCount={summary.memberCount}
      />
    </div>
  );
}

TeamDetailReady.propTypes = {
  team: PropTypes.object.isRequired,
  members: PropTypes.array.isRequired,
  stats: PropTypes.object,
  selectedGroup: PropTypes.object,
  activeTab: PropTypes.string.isRequired,
  setActiveTab: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  deleting: PropTypes.bool.isRequired,
  confirmDelete: PropTypes.func.isRequired,
  joinCode: PropTypes.string.isRequired,
  copyJoinCode: PropTypes.func.isRequired,
};

function TeamDetailView({
  viewState,
  team,
  members,
  stats,
  selectedGroup,
  activeTab,
  setActiveTab,
  navigate,
  deleting,
  confirmDelete,
  joinCode,
  copyJoinCode,
}) {
  const backToTeams = () => navigate('/teams');

  const views = {
    'no-group': <NoGroupSelected />,
    loading: <PageLoader />,
    'not-found': <TeamNotFound onBack={backToTeams} />,
    ready: (
      <TeamDetailReady
        team={team}
        members={members}
        stats={stats}
        selectedGroup={selectedGroup}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onBack={backToTeams}
        deleting={deleting}
        confirmDelete={confirmDelete}
        joinCode={joinCode}
        copyJoinCode={copyJoinCode}
      />
    ),
  };

  return views[viewState];
}

TeamDetailView.propTypes = {
  viewState: PropTypes.string.isRequired,
  team: PropTypes.object,
  members: PropTypes.array.isRequired,
  stats: PropTypes.object,
  selectedGroup: PropTypes.object,
  activeTab: PropTypes.string.isRequired,
  setActiveTab: PropTypes.func.isRequired,
  navigate: PropTypes.func.isRequired,
  deleting: PropTypes.bool.isRequired,
  confirmDelete: PropTypes.func.isRequired,
  joinCode: PropTypes.string.isRequired,
  copyJoinCode: PropTypes.func.isRequired,
};

export default function TeamDetail() {
  const model = useTeamDetailModel();

  return <TeamDetailView {...model} />;
}

function PageLoader() {
  return (
    <div className="page">
      <LoadingSpinner />
    </div>
  );
}

function TeamNotFound({ onBack }) {
  return (
    <div className="page">
      <div className="empty-state">
        <div className="empty-state-icon">❌</div>
        <div className="empty-state-text">Équipe introuvable</div>
      </div>

      <button className="btn btn-secondary" onClick={onBack}>
        ← Retour aux équipes
      </button>
    </div>
  );
}

TeamNotFound.propTypes = {
  onBack: PropTypes.func.isRequired,
};

function TeamHeader({ team, onBack }) {
  return (
    <div className="page-header slide-up">
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--tg-theme-link-color)',
          cursor: 'pointer',
          fontSize: 14,
          padding: '4px 0',
          marginBottom: 8,
        }}
      >
        ← Retour
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="avatar" style={{ fontSize: 28 }}>
          {(team.name || '?')[0].toUpperCase()}
        </div>

        <div>
          <h1 className="page-title">{team.name}</h1>
          <div className="page-subtitle">{team.description || 'Pas de description'}</div>
        </div>
      </div>
    </div>
  );
}

TeamHeader.propTypes = {
  team: PropTypes.object.isRequired,
  onBack: PropTypes.func.isRequired,
};

function TeamStats({ memberCount, totalScore, activitiesCount, groupName }) {
  return (
    <div className="stats-grid slide-up-delay-1">
      <StatCard value={memberCount} label="Membres" />
      <StatCard value={totalScore} label={`Score dans ${groupName}`} />
      <StatCard value={activitiesCount} label="Activités" />
    </div>
  );
}

TeamStats.propTypes = {
  memberCount: PropTypes.number.isRequired,
  totalScore: PropTypes.number.isRequired,
  activitiesCount: PropTypes.number.isRequired,
  groupName: PropTypes.string.isRequired,
};

function StatCard({ value, label }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

StatCard.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  label: PropTypes.string.isRequired,
};

function JoinCodeCard({ joinCode, onCopy }) {
  if (!joinCode) return null;

  return (
    <div className="card card-glow slide-up-delay-1" style={{ textAlign: 'center', marginBottom: 16 }}>
      <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 6 }}>
        Code d&apos;invitation
      </div>

      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: 4,
          fontFamily: 'monospace',
          color: 'var(--tg-theme-accent-text-color)',
        }}
      >
        {joinCode}
      </div>

      <button
        className="btn btn-secondary"
        style={{ marginTop: 10, padding: '8px 16px', fontSize: 13 }}
        onClick={onCopy}
      >
        📋 Copier le code
      </button>
    </div>
  );
}

JoinCodeCard.propTypes = {
  joinCode: PropTypes.string.isRequired,
  onCopy: PropTypes.func.isRequired,
};

function DeleteTeamButton({ deleting, onDelete }) {
  return (
    <div className="slide-up-delay-1" style={{ marginBottom: 16 }}>
      <button
        className="btn btn-secondary"
        style={{ width: '100%', color: '#e74c3c' }}
        onClick={onDelete}
        disabled={deleting}
      >
        {deleting ? '⏳ Suppression...' : "🗑 Supprimer l'équipe"}
      </button>
    </div>
  );
}

DeleteTeamButton.propTypes = {
  deleting: PropTypes.bool.isRequired,
  onDelete: PropTypes.func.isRequired,
};

function TeamTabs({ activeTab, memberCount, onTabChange }) {
  return (
    <div className="chips-row slide-up-delay-1">
      <TabButton
        active={activeTab === 'members'}
        onClick={() => onTabChange('members')}
      >
        👥 Membres ({memberCount})
      </TabButton>

      <TabButton
        active={activeTab === 'info'}
        onClick={() => onTabChange('info')}
      >
        📋 Info
      </TabButton>
    </div>
  );
}

TeamTabs.propTypes = {
  activeTab: PropTypes.string.isRequired,
  memberCount: PropTypes.number.isRequired,
  onTabChange: PropTypes.func.isRequired,
};

function TabButton({ active, onClick, children }) {
  return (
    <button className={`chip ${active ? 'active' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

TabButton.propTypes = {
  active: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

function TeamTabContent({ activeTab, members, team, memberCount }) {
  return (
    <div className="slide-up-delay-2">
      {activeTab === 'members' ? (
        <TeamMembersTab members={members} team={team} />
      ) : (
        <TeamInfoTab team={team} memberCount={memberCount} />
      )}
    </div>
  );
}

TeamTabContent.propTypes = {
  activeTab: PropTypes.string.isRequired,
  members: PropTypes.array.isRequired,
  team: PropTypes.object.isRequired,
  memberCount: PropTypes.number.isRequired,
};

function getMemberCount(team, members) {
  return team.members?.length || members.length || 0;
}

function getTotalScore(team, stats) {
  return stats?.totalScore || team.stats?.totalScore || 0;
}

function MembersFallback({ members }) {
  const list = members || [];

  if (list.length === 0) {
    return <EmptyMembersState />;
  }

  return list.map((member) => (
    <FallbackMemberItem key={member.userId || member.username} member={member} />
  ));
}

MembersFallback.propTypes = {
  members: PropTypes.arrayOf(
    PropTypes.shape({
      userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      username: PropTypes.string,
      isAdmin: PropTypes.bool,
    })
  ),
};

function EmptyMembersState() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">👥</div>
      <div className="empty-state-text">Aucun membre</div>
    </div>
  );
}

function FallbackMemberItem({ member }) {
  const username = member.username || 'Membre';

  return (
    <div className="list-item">
      <MemberAvatar initial={(username[0] || '?').toUpperCase()} />

      <div className="list-item-content">
        <div className="list-item-title">
          {username}
          <AdminBadge isAdmin={member.isAdmin} />
        </div>
      </div>
    </div>
  );
}

FallbackMemberItem.propTypes = {
  member: PropTypes.shape({
    username: PropTypes.string,
    isAdmin: PropTypes.bool,
  }).isRequired,
};

function TeamMembersTab({ members, team }) {
  if (members.length === 0) {
    return <MembersFallback members={team.members} />;
  }

  return (
    <div>
      {members.map((member, index) => (
        <TeamMemberItem
          key={getMemberKey(member, index)}
          member={member}
        />
      ))}
    </div>
  );
}

TeamMembersTab.propTypes = {
  members: PropTypes.array.isRequired,
  team: PropTypes.object.isRequired,
};

function TeamMemberItem({ member }) {
  const user = getMemberUser(member);
  const name = getMemberName(member);
  const initial = getInitial(name);
  const joinedAt = formatShortDate(member.joinedAt);
  const score = user.stats?.totalScore || 0;

  return (
    <div className="list-item">
      <MemberAvatar initial={initial} />

      <div className="list-item-content">
        <div className="list-item-title">
          {name}
          <AdminBadge isAdmin={member.isAdmin} />
        </div>

        <div className="list-item-subtitle">
          Rejoint le {joinedAt}
        </div>
      </div>

      <div className="list-item-value" style={{ fontSize: 13 }}>
        {score} pts
      </div>
    </div>
  );
}

TeamMemberItem.propTypes = {
  member: PropTypes.object.isRequired,
};

function MemberAvatar({ initial }) {
  return (
    <div className="avatar" style={{ width: 40, height: 40, fontSize: 16 }}>
      {initial}
    </div>
  );
}

MemberAvatar.propTypes = {
  initial: PropTypes.string.isRequired,
};

function AdminBadge({ isAdmin }) {
  if (!isAdmin) return null;

  return (
    <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--tg-theme-accent-text-color)' }}>
      👑 Admin
    </span>
  );
}

AdminBadge.propTypes = {
  isAdmin: PropTypes.bool,
};

function getMemberUser(member) {
  return member.userId || member;
}

function getMemberName(member) {
  const user = getMemberUser(member);
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();

  return user.username || fullName || 'Membre';
}

function getInitial(name) {
  return (name[0] || '?').toUpperCase();
}

function getMemberKey(member, index) {
  const user = getMemberUser(member);

  return user._id || user.userId || user.username || member.username || index;
}

function formatShortDate(date) {
  if (!date) return '—';

  return new Date(date).toLocaleDateString('fr-FR');
}

function TeamInfoTab({ team, memberCount }) {
  const fields = getTeamInfoFields(team, memberCount);

  return (
    <div className="card">
      {fields.map((field) => (
        <InfoField key={field.label} label={field.label} value={field.value} />
      ))}
    </div>
  );
}

TeamInfoTab.propTypes = {
  team: PropTypes.object.isRequired,
  memberCount: PropTypes.number.isRequired,
};

function getTeamInfoFields(team, memberCount) {
  return [
    {
      label: 'Nom',
      value: team.name,
    },
    team.description && {
      label: 'Description',
      value: team.description,
    },
    {
      label: 'Créée le',
      value: formatLongDate(team.createdAt),
    },
    {
      label: 'Capacité',
      value: `${memberCount}/${team.settings?.maxMembers || 10} membres`,
    },
    team.createdBy && {
      label: 'Créée par',
      value: getCreatorName(team.createdBy),
    },
  ].filter(Boolean);
}

function InfoField({ label, value }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 4 }}>
        {label}
      </div>

      <div style={{ fontWeight: 600 }}>
        {value}
      </div>
    </div>
  );
}

InfoField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
};

function formatLongDate(date) {
  if (!date) return '—';

  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getCreatorName(createdBy) {
  return createdBy.username || createdBy.firstName || '—';
}