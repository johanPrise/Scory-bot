import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import * as api from '../api';
import { EmptyState, LoadingSpinner, NoGroupSelected } from '../components';
import { useToast } from '../components/Toast';
import { useGroup } from '../components/GroupContext';

const EMPTY_CREATE_FORM = { name: '', description: '', maxMembers: 10 };
const EMPTY_JOIN_FORM = { joinCode: '' };

function impact(type = 'light') {
  globalThis.Telegram?.WebApp?.HapticFeedback?.impactOccurred(type);
}

function notify(type) {
  globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
}

function getTeamId(team) {
  return team._id || team.id;
}

function getMemberCount(team) {
  return team.stats?.memberCount || team.members?.length || team.memberCount || 0;
}

function getTeamScore(team) {
  return team.stats?.totalScore || team.totalScore || 0;
}

function getActivitiesCount(team) {
  return team.stats?.activitiesCount || team.activities?.length || 0;
}

function getTeamInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
}

function getTeamStats(teams) {
  return teams.reduce((stats, team) => ({
    total: stats.total + 1,
    members: stats.members + getMemberCount(team),
    score: stats.score + getTeamScore(team),
  }), { total: 0, members: 0, score: 0 });
}

function filterTeams(teams, search) {
  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) return teams;

  return teams.filter(team =>
    `${team.name || ''} ${team.description || ''}`.toLowerCase().includes(normalizedSearch)
  );
}

function TeamsHero({ groupName, stats }) {
  return (
    <section className="teams-hero slide-up">
      <div>
        <div className="dashboard-eyebrow">Squads</div>
        <h1 className="teams-title">Équipes</h1>
        <p className="teams-subtitle">{groupName} · organisez les scores par collectif.</p>
      </div>
      <div className="teams-hero-meter" aria-label={`${stats.total} équipes`}>
        <span>Équipes</span>
        <strong>{stats.total}</strong>
      </div>
    </section>
  );
}

TeamsHero.propTypes = {
  groupName: PropTypes.string.isRequired,
  stats: PropTypes.shape({
    total: PropTypes.number.isRequired,
  }).isRequired,
};

function TeamsMetrics({ stats }) {
  return (
    <section className="metric-strip slide-up-delay-1" aria-label="Résumé des équipes">
      <div className="metric-tile metric-tile-score">
        <div className="metric-value">{stats.total}</div>
        <div className="metric-label">Équipes</div>
      </div>
      <div className="metric-tile">
        <div className="metric-value">{stats.members}</div>
        <div className="metric-label">Membres</div>
      </div>
      <div className="metric-tile metric-tile-leader">
        <div className="metric-value">{stats.score}</div>
        <div className="metric-label">Points</div>
      </div>
    </section>
  );
}

TeamsMetrics.propTypes = {
  stats: PropTypes.shape({
    total: PropTypes.number.isRequired,
    members: PropTypes.number.isRequired,
    score: PropTypes.number.isRequired,
  }).isRequired,
};

function TeamSearch({ search, onSearchChange }) {
  return (
    <label className="team-search-wrap">
      <span aria-hidden="true">⌕</span>
      <input
        type="search"
        value={search}
        onChange={event => onSearchChange(event.target.value)}
        placeholder="Rechercher une équipe"
        aria-label="Rechercher une équipe"
      />
    </label>
  );
}

TeamSearch.propTypes = {
  search: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
};

function TeamsToolbar({ search, mode, onSearchChange, onModeChange }) {
  return (
    <section className="teams-toolbar slide-up-delay-1">
      <TeamSearch search={search} onSearchChange={onSearchChange} />
      <div className="team-action-switch" aria-label="Actions équipes">
        <button
          type="button"
          className={mode === 'create' ? 'active' : ''}
          aria-pressed={mode === 'create'}
          onClick={() => onModeChange(mode === 'create' ? null : 'create')}
        >
          Créer
        </button>
        <button
          type="button"
          className={mode === 'join' ? 'active' : ''}
          aria-pressed={mode === 'join'}
          onClick={() => onModeChange(mode === 'join' ? null : 'join')}
        >
          Rejoindre
        </button>
      </div>
    </section>
  );
}

TeamsToolbar.propTypes = {
  search: PropTypes.string.isRequired,
  mode: PropTypes.oneOf(['create', 'join', null]),
  onSearchChange: PropTypes.func.isRequired,
  onModeChange: PropTypes.func.isRequired,
};

function TeamActionPanel({ mode, submitting, onCreate, onJoin, onCancel }) {
  if (!mode) return null;

  return mode === 'create' ? (
    <CreateTeamForm submitting={submitting} onSubmit={onCreate} onCancel={onCancel} />
  ) : (
    <JoinTeamForm submitting={submitting} onSubmit={onJoin} onCancel={onCancel} />
  );
}

TeamActionPanel.propTypes = {
  mode: PropTypes.oneOf(['create', 'join', null]),
  submitting: PropTypes.bool.isRequired,
  onCreate: PropTypes.func.isRequired,
  onJoin: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

function CreateTeamForm({ submitting, onSubmit, onCancel }) {
  const [form, setForm] = useState(EMPTY_CREATE_FORM);
  const canSubmit = form.name.trim().length >= 2 && !submitting;

  const update = field => event => {
    const value = field === 'maxMembers'
      ? Number(event.target.value)
      : event.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = event => {
    event.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      name: form.name.trim(),
      description: form.description.trim(),
      settings: { maxMembers: form.maxMembers },
    });
  };

  return (
    <form className="team-form-panel slide-up" onSubmit={handleSubmit}>
      <PanelHeader title="Créer une équipe" onCancel={onCancel} />

      <label className="form-group" htmlFor="teamName">
        <span className="form-label">Nom</span>
        <input
          id="teamName"
          className="form-input"
          type="text"
          value={form.name}
          minLength={2}
          maxLength={50}
          required
          onChange={update('name')}
          placeholder="Les Champions"
        />
      </label>

      <label className="form-group" htmlFor="teamDescription">
        <span className="form-label">Description</span>
        <textarea
          id="teamDescription"
          className="form-textarea"
          value={form.description}
          maxLength={500}
          rows={3}
          onChange={update('description')}
          placeholder="Objectif, style de jeu ou règle d'équipe."
        />
      </label>

      <label className="form-group" htmlFor="teamMaxMembers">
        <span className="form-label">Capacité</span>
        <input
          id="teamMaxMembers"
          className="form-input"
          type="number"
          min={1}
          max={100}
          value={form.maxMembers}
          onChange={update('maxMembers')}
        />
      </label>

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

CreateTeamForm.propTypes = {
  submitting: PropTypes.bool.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

function JoinTeamForm({ submitting, onSubmit, onCancel }) {
  const [form, setForm] = useState(EMPTY_JOIN_FORM);
  const normalizedCode = form.joinCode.trim().toUpperCase();
  const canSubmit = normalizedCode.length >= 4 && !submitting;

  const handleSubmit = event => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit(normalizedCode);
  };

  return (
    <form className="team-form-panel slide-up" onSubmit={handleSubmit}>
      <PanelHeader title="Rejoindre une équipe" onCancel={onCancel} />

      <label className="form-group" htmlFor="teamJoinCode">
        <span className="form-label">Code d'invitation</span>
        <input
          id="teamJoinCode"
          className="form-input team-code-input"
          type="text"
          value={form.joinCode}
          required
          onChange={event => setForm({ joinCode: event.target.value.toUpperCase() })}
          placeholder="ABC12345"
        />
      </label>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
          {submitting ? 'Rejointure...' : 'Rejoindre'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </form>
  );
}

JoinTeamForm.propTypes = {
  submitting: PropTypes.bool.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

function PanelHeader({ title, onCancel }) {
  return (
    <div className="team-form-header">
      <div>
        <div className="dashboard-eyebrow">Action équipe</div>
        <h2>{title}</h2>
      </div>
      <button type="button" className="icon-button" onClick={onCancel} aria-label="Fermer le panneau">
        ×
      </button>
    </div>
  );
}

PanelHeader.propTypes = {
  title: PropTypes.string.isRequired,
  onCancel: PropTypes.func.isRequired,
};

function TeamCard({ team, index, groupName, onOpen }) {
  const memberCount = getMemberCount(team);
  const totalScore = getTeamScore(team);
  const activitiesCount = getActivitiesCount(team);

  return (
    <button type="button" className="team-card" onClick={onOpen}>
      <span className={`team-card-avatar team-tone-${index % 4}`}>
        {getTeamInitials(team.name || 'Équipe')}
      </span>
      <span className="team-card-body">
        <span className="team-card-meta">{groupName}</span>
        <span className="team-card-title">{team.name || 'Équipe'}</span>
        <span className="team-card-description">{team.description || 'Pas de description'}</span>
        <span className="team-card-stats">
          <span>{memberCount} membre{memberCount > 1 ? 's' : ''}</span>
          <span>{activitiesCount} activité{activitiesCount > 1 ? 's' : ''}</span>
          <span>{totalScore} pts</span>
        </span>
      </span>
      <span className="team-card-score">
        <strong>{totalScore}</strong>
        <span>pts</span>
      </span>
    </button>
  );
}

TeamCard.propTypes = {
  team: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  groupName: PropTypes.string.isRequired,
  onOpen: PropTypes.func.isRequired,
};

function TeamsList({ teams, loading, groupName, onOpen }) {
  if (loading) return <LoadingSpinner />;

  if (teams.length === 0) {
    return <EmptyState icon="👥" text="Aucune équipe pour ces critères." />;
  }

  return (
    <section className="teams-list slide-up-delay-2" aria-label="Liste des équipes">
      {teams.map((team, index) => (
        <TeamCard
          key={getTeamId(team) || index}
          team={team}
          index={index}
          groupName={groupName}
          onOpen={() => onOpen(getTeamId(team))}
        />
      ))}
    </section>
  );
}

TeamsList.propTypes = {
  teams: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  groupName: PropTypes.string.isRequired,
  onOpen: PropTypes.func.isRequired,
};

function useTeams(selectedGroupId) {
  const toast = useToast();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadTeams = useCallback(async () => {
    setLoading(true);

    try {
      const data = await api.getTeams({ limit: 100 });
      setTeams(data.teams || []);
    } catch (error) {
      console.error('Erreur chargement équipes:', error);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedGroupId) {
      setTeams([]);
      setLoading(false);
      return;
    }

    loadTeams();
  }, [selectedGroupId, loadTeams]);

  const createTeam = useCallback(async payload => {
    setSubmitting(true);

    try {
      await api.createTeam(payload);
      notify('success');
      toast.success('Équipe créée avec succès.');
      await loadTeams();
      return true;
    } catch (error) {
      notify('error');
      toast.error(error.message || "Impossible de créer l'équipe.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [loadTeams, toast]);

  const joinTeam = useCallback(async joinCode => {
    setSubmitting(true);

    try {
      await api.joinTeam(joinCode);
      notify('success');
      toast.success('Équipe rejointe avec succès.');
      await loadTeams();
      return true;
    } catch (error) {
      notify('error');
      toast.error(error.message || "Impossible de rejoindre l'équipe.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [loadTeams, toast]);

  return {
    teams,
    loading,
    submitting,
    createTeam,
    joinTeam,
  };
}

export default function Teams() {
  const navigate = useNavigate();
  const { selectedGroupId, selectedGroup } = useGroup();
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState(null);
  const { teams, loading, submitting, createTeam, joinTeam } = useTeams(selectedGroupId);

  const groupName = selectedGroup?.title || 'Groupe';
  const stats = useMemo(() => getTeamStats(teams), [teams]);
  const visibleTeams = useMemo(() => filterTeams(teams, search), [teams, search]);

  const changeMode = useCallback(nextMode => {
    impact(nextMode ? 'medium' : 'light');
    setMode(nextMode);
  }, []);

  const closePanel = useCallback(() => setMode(null), []);

  const handleCreate = useCallback(async payload => {
    const ok = await createTeam(payload);
    if (ok) closePanel();
  }, [closePanel, createTeam]);

  const handleJoin = useCallback(async joinCode => {
    const ok = await joinTeam(joinCode);
    if (ok) closePanel();
  }, [closePanel, joinTeam]);

  const openTeam = useCallback(teamId => {
    if (!teamId) return;
    navigate(`/teams/${teamId}`);
  }, [navigate]);

  if (!selectedGroupId) return <NoGroupSelected />;

  return (
    <div className="page teams-page">
      <TeamsHero groupName={groupName} stats={stats} />
      <TeamsMetrics stats={stats} />

      <TeamsToolbar
        search={search}
        mode={mode}
        onSearchChange={setSearch}
        onModeChange={changeMode}
      />

      <TeamActionPanel
        mode={mode}
        submitting={submitting}
        onCreate={handleCreate}
        onJoin={handleJoin}
        onCancel={closePanel}
      />

      <TeamsList
        teams={visibleTeams}
        loading={loading}
        groupName={groupName}
        onOpen={openTeam}
      />
    </div>
  );
}
