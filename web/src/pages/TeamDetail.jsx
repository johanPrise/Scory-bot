import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useParams } from 'react-router-dom';
import * as api from '../api';
import { EmptyState, LoadingSpinner, NoGroupSelected } from '../components';
import { useToast } from '../components/Toast';
import { useGroup } from '../components/GroupContext';

const INITIAL_TEAM_DATA = {
  team: null,
  members: [],
  stats: null,
  loading: true,
  teamId: null,
};

function getFulfilledValue(result) {
  return result.status === 'fulfilled' ? result.value : null;
}

function getTeamFromResponse(response) {
  return response?.team || response || null;
}

function getMembersFromResponse(response) {
  return response?.members || [];
}

function getStatsFromResponse(response) {
  return response?.stats || response || null;
}

function normalizeTeamResults(teamId, results) {
  const [teamResult, membersResult, statsResult] = results;

  return {
    team: getTeamFromResponse(getFulfilledValue(teamResult)),
    members: getMembersFromResponse(getFulfilledValue(membersResult)),
    stats: getStatsFromResponse(getFulfilledValue(statsResult)),
    loading: false,
    teamId,
  };
}

function useTeamData(teamId, enabled) {
  const [data, setData] = useState(INITIAL_TEAM_DATA);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;

    const loadTeam = async () => {
      try {
        const results = await Promise.allSettled([
          api.getTeam(teamId),
          api.getTeamMembers(teamId),
          api.getTeamStats(teamId),
        ]);

        if (!cancelled) setData(normalizeTeamResults(teamId, results));
      } catch (error) {
        console.error('Erreur chargement équipe:', error);
        if (!cancelled) {
          setData(current => ({ ...current, teamId, loading: false }));
        }
      }
    };

    void loadTeam();

    return () => {
      cancelled = true;
    };
  }, [enabled, teamId]);

  if (!enabled) return { ...INITIAL_TEAM_DATA, loading: false, teamId };
  if (data.teamId !== teamId) return { ...INITIAL_TEAM_DATA, teamId };

  return data;
}

function getDeleteMessage(teamName) {
  return `Supprimer l'équipe "${teamName || 'cette équipe'}" ? Cette action est irréversible.`;
}

async function confirmAction(message) {
  const tg = globalThis.Telegram?.WebApp;
  if (tg?.showConfirm) {
    return new Promise(resolve => tg.showConfirm(message, resolve));
  }

  return globalThis.confirm(message);
}

function notify(type) {
  globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
}

function useDeleteTeam({ teamId, teamName, navigate, toast }) {
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = useCallback(async () => {
    const confirmed = await confirmAction(getDeleteMessage(teamName));
    if (!confirmed) return;

    setDeleting(true);

    try {
      await api.deleteTeam(teamId);
      notify('success');
      toast.success('Équipe supprimée.');
      navigate('/teams');
    } catch (error) {
      notify('error');
      toast.error(error.message || "Impossible de supprimer l'équipe.");
    } finally {
      setDeleting(false);
    }
  }, [navigate, teamId, teamName, toast]);

  return { deleting, confirmDelete };
}

function useJoinCode(team) {
  const joinCode = team?.settings?.joinCode || '';

  const copyJoinCode = useCallback(async () => {
    if (!joinCode) return;

    try {
      await navigator.clipboard?.writeText(joinCode);
      notify('success');
    } catch {
      notify('error');
    }
  }, [joinCode]);

  return { joinCode, copyJoinCode };
}

function canLoadTeam(teamId, selectedGroupId) {
  return Boolean(teamId && selectedGroupId);
}

function getTeamName(team) {
  return team?.name || '';
}

function getTeamViewState(selectedGroupId, loading, team) {
  if (!selectedGroupId) return 'no-group';
  if (loading) return 'loading';
  if (!team) return 'not-found';
  return 'ready';
}

function getMemberCount(team, members, stats) {
  return stats?.memberCount || team?.members?.length || members.length || 0;
}

function getAdminCount(team, members, stats) {
  if (stats?.adminCount !== undefined) return stats.adminCount;
  const source = members.length ? members : team?.members || [];
  return source.filter(member => member.isAdmin).length;
}

function getTotalScore(team, stats) {
  return stats?.totalScore || team?.stats?.totalScore || 0;
}

function getActivitiesCount(team, stats) {
  return stats?.activitiesCount || team?.activities?.length || 0;
}

function getGroupName(selectedGroup) {
  return selectedGroup?.title || 'Groupe';
}

function getCapacity(team) {
  return team?.settings?.maxMembers || 10;
}

function getTeamSummary({ team, members, stats, selectedGroup }) {
  return {
    memberCount: getMemberCount(team, members, stats),
    adminCount: getAdminCount(team, members, stats),
    totalScore: getTotalScore(team, stats),
    activitiesCount: getActivitiesCount(team, stats),
    capacity: getCapacity(team),
    groupName: getGroupName(selectedGroup),
  };
}

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
}

function getMemberUser(member) {
  return member.userId || member;
}

function getMemberName(member) {
  const user = getMemberUser(member);
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();

  return user.username || fullName || member.username || 'Membre';
}

function getMemberScore(member) {
  const user = getMemberUser(member);
  return user.stats?.totalScore || 0;
}

function getMemberKey(member, index) {
  const user = getMemberUser(member);
  return user._id || user.userId || user.username || member.username || index;
}

function formatShortDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR');
}

function formatLongDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getCreatorName(createdBy) {
  return createdBy?.username || createdBy?.firstName || '—';
}

function useTeamDetailModel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { selectedGroupId, selectedGroup } = useGroup();
  const teamData = useTeamData(id, canLoadTeam(id, selectedGroupId));
  const [activeTab, setActiveTab] = useState('members');
  const { deleting, confirmDelete } = useDeleteTeam({
    teamId: id,
    teamName: getTeamName(teamData.team),
    navigate,
    toast,
  });
  const joinCode = useJoinCode(teamData.team);

  return {
    viewState: getTeamViewState(selectedGroupId, teamData.loading, teamData.team),
    team: teamData.team,
    members: teamData.members,
    stats: teamData.stats,
    selectedGroup,
    activeTab,
    setActiveTab,
    navigate,
    deleting,
    confirmDelete,
    joinCode: joinCode.joinCode,
    copyJoinCode: joinCode.copyJoinCode,
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
    <div className="page team-detail-page">
      <TeamHero team={team} summary={summary} onBack={onBack} />
      <TeamStatStrip summary={summary} />
      <JoinCodeCard joinCode={joinCode} onCopy={copyJoinCode} />
      <TeamTabs activeTab={activeTab} memberCount={summary.memberCount} onTabChange={setActiveTab} />
      <TeamTabContent
        activeTab={activeTab}
        members={members}
        team={team}
        summary={summary}
        deleting={deleting}
        onDelete={confirmDelete}
      />
    </div>
  );
}

TeamDetailReady.propTypes = {
  team: PropTypes.object.isRequired,
  members: PropTypes.array.isRequired,
  stats: PropTypes.object,
  selectedGroup: PropTypes.object,
  activeTab: PropTypes.oneOf(['members', 'info']).isRequired,
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
  activeTab: PropTypes.oneOf(['members', 'info']).isRequired,
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
      <EmptyState icon="❌" text="Équipe introuvable" />
      <button type="button" className="btn btn-secondary" onClick={onBack}>
        Retour aux équipes
      </button>
    </div>
  );
}

TeamNotFound.propTypes = {
  onBack: PropTypes.func.isRequired,
};

function TeamHero({ team, summary, onBack }) {
  return (
    <section className="team-detail-hero slide-up">
      <button type="button" className="team-back-button" onClick={onBack}>
        ← Retour
      </button>
      <div className="team-detail-hero-main">
        <div className="team-detail-avatar">{getInitials(team.name || 'Équipe')}</div>
        <div className="team-detail-copy">
          <div className="dashboard-eyebrow">{summary.groupName}</div>
          <h1>{team.name}</h1>
          <p>{team.description || 'Pas de description'}</p>
        </div>
      </div>
      <div className="team-detail-meta-row">
        <span>{summary.memberCount}/{summary.capacity} membres</span>
        <span>{summary.adminCount} admin{summary.adminCount > 1 ? 's' : ''}</span>
      </div>
    </section>
  );
}

TeamHero.propTypes = {
  team: PropTypes.object.isRequired,
  summary: PropTypes.object.isRequired,
  onBack: PropTypes.func.isRequired,
};

function TeamStatStrip({ summary }) {
  return (
    <section className="team-stat-strip slide-up-delay-1" aria-label="Statistiques de l'équipe">
      <TeamStat value={summary.memberCount} label="Membres" />
      <TeamStat value={summary.totalScore} label="Points" />
      <TeamStat value={summary.activitiesCount} label="Activités" />
    </section>
  );
}

TeamStatStrip.propTypes = {
  summary: PropTypes.object.isRequired,
};

function TeamStat({ value, label }) {
  return (
    <div className="team-stat-card">
      <div className="team-stat-value">{value}</div>
      <div className="team-stat-label">{label}</div>
    </div>
  );
}

TeamStat.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  label: PropTypes.string.isRequired,
};

function JoinCodeCard({ joinCode, onCopy }) {
  if (!joinCode) return null;

  return (
    <section className="team-code-panel slide-up-delay-1">
      <div>
        <div className="dashboard-eyebrow">Invitation</div>
        <div className="team-code-value">{joinCode}</div>
      </div>
      <button type="button" className="btn btn-secondary" onClick={onCopy}>
        Copier
      </button>
    </section>
  );
}

JoinCodeCard.propTypes = {
  joinCode: PropTypes.string.isRequired,
  onCopy: PropTypes.func.isRequired,
};

function TeamTabs({ activeTab, memberCount, onTabChange }) {
  return (
    <div className="team-detail-tabs slide-up-delay-1" aria-label="Sections équipe">
      <button
        type="button"
        className={activeTab === 'members' ? 'active' : ''}
        aria-pressed={activeTab === 'members'}
        onClick={() => onTabChange('members')}
      >
        Membres <span>{memberCount}</span>
      </button>
      <button
        type="button"
        className={activeTab === 'info' ? 'active' : ''}
        aria-pressed={activeTab === 'info'}
        onClick={() => onTabChange('info')}
      >
        Info
      </button>
    </div>
  );
}

TeamTabs.propTypes = {
  activeTab: PropTypes.oneOf(['members', 'info']).isRequired,
  memberCount: PropTypes.number.isRequired,
  onTabChange: PropTypes.func.isRequired,
};

function TeamTabContent({ activeTab, members, team, summary, deleting, onDelete }) {
  return (
    <div className="slide-up-delay-2">
      {activeTab === 'members' ? (
        <TeamMembersTab members={members} team={team} />
      ) : (
        <TeamInfoTab team={team} summary={summary} deleting={deleting} onDelete={onDelete} />
      )}
    </div>
  );
}

TeamTabContent.propTypes = {
  activeTab: PropTypes.oneOf(['members', 'info']).isRequired,
  members: PropTypes.array.isRequired,
  team: PropTypes.object.isRequired,
  summary: PropTypes.object.isRequired,
  deleting: PropTypes.bool.isRequired,
  onDelete: PropTypes.func.isRequired,
};

function TeamMembersTab({ members, team }) {
  const list = members.length ? members : team.members || [];

  if (list.length === 0) {
    return <EmptyState icon="👥" text="Aucun membre dans cette équipe." />;
  }

  return (
    <section className="team-members-list" aria-label="Membres de l'équipe">
      {list.map((member, index) => (
        <TeamMemberCard key={getMemberKey(member, index)} member={member} />
      ))}
    </section>
  );
}

TeamMembersTab.propTypes = {
  members: PropTypes.array.isRequired,
  team: PropTypes.object.isRequired,
};

function TeamMemberCard({ member }) {
  const name = getMemberName(member);
  const score = getMemberScore(member);

  return (
    <article className="team-member-card">
      <div className="team-member-avatar">{getInitials(name)}</div>
      <div className="team-member-body">
        <h2>
          {name}
          {member.isAdmin && <span>Admin</span>}
        </h2>
        <p>Rejoint le {formatShortDate(member.joinedAt)}</p>
      </div>
      <div className="team-member-score">
        <strong>{score}</strong>
        <span>pts</span>
      </div>
    </article>
  );
}

TeamMemberCard.propTypes = {
  member: PropTypes.object.isRequired,
};

function TeamInfoTab({ team, summary, deleting, onDelete }) {
  const fields = [
    { label: 'Nom', value: team.name },
    { label: 'Description', value: team.description || '—' },
    { label: 'Créée le', value: formatLongDate(team.createdAt) },
    { label: 'Capacité', value: `${summary.memberCount}/${summary.capacity} membres` },
    { label: 'Créée par', value: getCreatorName(team.createdBy) },
  ];

  return (
    <section className="team-info-panel">
      {fields.map(field => (
        <div className="activity-info-row" key={field.label}>
          <div>{field.label}</div>
          <strong>{field.value}</strong>
        </div>
      ))}

      <div className="team-danger-zone">
        <div>
          <h2>Zone sensible</h2>
          <p>La suppression retire l'équipe du groupe.</p>
        </div>
        <button
          type="button"
          className="btn btn-secondary team-danger-button"
          onClick={onDelete}
          disabled={deleting}
        >
          {deleting ? 'Suppression...' : "Supprimer l'équipe"}
        </button>
      </div>
    </section>
  );
}

TeamInfoTab.propTypes = {
  team: PropTypes.object.isRequired,
  summary: PropTypes.object.isRequired,
  deleting: PropTypes.bool.isRequired,
  onDelete: PropTypes.func.isRequired,
};
