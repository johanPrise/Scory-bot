import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as api from '../api';
import { BackButton, EmptyState, LoadingSpinner, NoGroupSelected } from '../components';
import { useToast } from '../components/Toast';
import { useGroup } from '../components/GroupContext';

const TEXT = {
  title: 'Nouveau score',
  subtitle: 'Choisis la cible, l’activité, puis valide la performance.',
  success: 'Score ajouté avec succès !',
  submitError: "Erreur lors de l'ajout du score",
  noActivity: 'Aucune activité disponible.',
  noMember: 'Aucun membre disponible dans ce groupe.',
  noTeam: 'Aucune équipe disponible.',
  commentPlaceholder: 'Note optionnelle, contexte, preuve...',
};

const DEFAULT_MAX_POSSIBLE = '100';

const initialForm = activityId => ({
  activityId,
  subActivity: '',
  value: '',
  maxPossible: DEFAULT_MAX_POSSIBLE,
  context: 'individual',
  userId: '',
  teamId: '',
  comments: '',
});

function triggerTelegramFeedback(type) {
  globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
}

function triggerTelegramImpact() {
  globalThis.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
}

function isValidScoreCalculation(score, max) {
  return Number.isFinite(score) && Number.isFinite(max) && max > 0;
}

function getNormalizedScore(value, maxPossible) {
  if (!value || !maxPossible) return null;

  const score = Number(value);
  const max = Number(maxPossible);

  if (!isValidScoreCalculation(score, max)) return null;
  return Math.round((score / max) * 100);
}

function getDisplayName(user = {}) {
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return user.username || fullName || 'Membre';
}

function getInitials(name) {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function mapGroupMembers(members = []) {
  return members
    .map(member => {
      const user = member.userId || {};
      const id = typeof user === 'string' ? user : user._id;
      const name = getDisplayName(user);

      return {
        id,
        name,
        role: member.role || 'member',
        initials: getInitials(name),
      };
    })
    .filter(member => member.id);
}

function buildScorePayload(form) {
  const payload = {
    activityId: form.activityId,
    value: Number(form.value),
    maxPossible: Number(form.maxPossible),
    context: form.context,
    comments: form.comments || undefined,
  };

  if (form.subActivity) payload.subActivity = form.subActivity;
  if (form.context === 'team') payload.teamId = form.teamId;
  if (form.context === 'individual') payload.userId = form.userId;

  return payload;
}

function getValidationMessage(form) {
  if (!form.activityId) return 'Choisis une activité.';
  if (form.context === 'individual' && !form.userId) return 'Choisis un participant.';
  if (form.context === 'team' && !form.teamId) return 'Choisis une équipe.';
  if (!form.value || !form.maxPossible) return 'Renseigne le score et le maximum.';
  if (!isValidScoreCalculation(Number(form.value), Number(form.maxPossible))) return 'Le score maximum doit être supérieur à 0.';

  return null;
}

async function fetchScoreFormData(selectedGroupId) {
  return Promise.allSettled([
    api.getActivities({ limit: 100, includeSubActivities: 'true' }),
    api.getTeams(),
    api.getGroup(selectedGroupId),
  ]);
}

function applyActivityResult(result, setActivities, setDefaultActivity) {
  if (result.status === 'fulfilled') {
    const fetchedActivities = result.value.activities || [];
    setActivities(fetchedActivities);
    setDefaultActivity(fetchedActivities);
  }
}

function applyTeamResult(result, setTeams) {
  if (result.status === 'fulfilled') {
    setTeams(result.value.teams || []);
  }
}

function applyGroupResult(result, setMembers) {
  if (result.status === 'fulfilled') {
    setMembers(mapGroupMembers(result.value.group?.members));
  }
}

function applyScoreFormData(results, setters) {
  const [activityResult, teamResult, groupResult] = results;

  applyActivityResult(activityResult, setters.setActivities, setters.setDefaultActivity);
  applyTeamResult(teamResult, setters.setTeams);
  applyGroupResult(groupResult, setters.setMembers);
}

function useScoreOptions(selectedGroupId, setDefaultActivity) {
  const [activities, setActivities] = useState([]);
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const results = await fetchScoreFormData(selectedGroupId);
      applyScoreFormData(results, { setActivities, setTeams, setMembers, setDefaultActivity });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [selectedGroupId, setDefaultActivity]);

  useEffect(() => {
    if (selectedGroupId) {
      loadData();
    }
  }, [selectedGroupId, loadData]);

  return { activities, teams, members, loading };
}

function useScoreForm(preselectedActivity) {
  const [form, setForm] = useState(() => initialForm(preselectedActivity));

  const setDefaultActivity = useCallback(activities => {
    setForm(currentForm => {
      const defaultActivityId = activities[0]?._id;

      if (currentForm.activityId) return currentForm;
      if (defaultActivityId) return { ...currentForm, activityId: defaultActivityId };
      return currentForm;
    });
  }, []);

  const updateField = useCallback((field, value) => {
    setForm(currentForm => ({ ...currentForm, [field]: value }));
  }, []);

  const updateActivity = useCallback(activity => {
    triggerTelegramImpact();
    setForm(currentForm => ({
      ...currentForm,
      activityId: activity._id,
      subActivity: '',
      maxPossible: DEFAULT_MAX_POSSIBLE,
    }));
  }, []);

  const updateSubActivity = useCallback(subActivity => {
    triggerTelegramImpact();
    setForm(currentForm => ({
      ...currentForm,
      subActivity: subActivity?.name || '',
      maxPossible: String(subActivity?.maxScore || DEFAULT_MAX_POSSIBLE),
    }));
  }, []);

  const updateContext = useCallback(context => {
    triggerTelegramImpact();
    setForm(currentForm => ({
      ...currentForm,
      context,
      teamId: context === 'individual' ? '' : currentForm.teamId,
      userId: context === 'team' ? '' : currentForm.userId,
    }));
  }, []);

  return { form, setDefaultActivity, updateActivity, updateContext, updateField, updateSubActivity };
}

function FlowHeader({ groupName }) {
  return (
    <div className="score-flow-header slide-up">
      <BackButton fallback="/" />
      <div className="score-flow-kicker">Scoreboard</div>
      <h1 className="score-flow-title">{TEXT.title}</h1>
      <p className="score-flow-subtitle">{TEXT.subtitle}</p>
      <div className="score-flow-group">📍 {groupName}</div>
    </div>
  );
}

FlowHeader.propTypes = {
  groupName: PropTypes.string.isRequired,
};

function StepSection({ number, title, children }) {
  return (
    <section className="score-step">
      <div className="score-step-heading">
        <span>{number}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

StepSection.propTypes = {
  number: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

function OptionCard({ active, title, subtitle, meta, initials, onClick }) {
  return (
    <button
      type="button"
      className={`option-card${active ? ' active' : ''}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {initials && <span className="option-avatar">{initials}</span>}
      <span className="option-body">
        <span className="option-title">{title}</span>
        {subtitle && <span className="option-subtitle">{subtitle}</span>}
      </span>
      {meta && <span className="option-meta">{meta}</span>}
    </button>
  );
}

OptionCard.propTypes = {
  active: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  meta: PropTypes.string,
  initials: PropTypes.string,
  onClick: PropTypes.func.isRequired,
};

function ContextToggle({ value, onChange }) {
  return (
    <fieldset className="segmented-control">
      <legend className="sr-only">Type de score</legend>
      <button
        type="button"
        className={value === 'individual' ? 'active' : ''}
        aria-pressed={value === 'individual'}
        onClick={() => onChange('individual')}
      >
        Individuel
      </button>
      <button
        type="button"
        className={value === 'team' ? 'active' : ''}
        aria-pressed={value === 'team'}
        onClick={() => onChange('team')}
      >
        Équipe
      </button>
    </fieldset>
  );
}

ContextToggle.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

function ActivityStep({ activities, selectedActivityId, selectedSubActivity, onActivityChange, onSubActivityChange }) {
  const selectedActivity = activities.find(activity => activity._id === selectedActivityId);
  const subActivities = selectedActivity?.subActivities || [];
  const isGeneralSubActivity = selectedSubActivity === '';

  return (
    <StepSection number="01" title="Activité">
      {activities.length > 0 ? (
        <div className="option-list">
          {activities.map(activity => (
            <OptionCard
              key={activity._id}
              active={activity._id === selectedActivityId}
              title={activity.name}
              subtitle={activity.description}
              meta={`${activity.subActivities?.length || 0} sous-activité${activity.subActivities?.length > 1 ? 's' : ''}`}
              onClick={() => onActivityChange(activity)}
            />
          ))}
        </div>
      ) : (
        <EmptyState icon="📋" text={TEXT.noActivity} />
      )}

      {subActivities.length > 0 && (
        <div className="subchoice-row" aria-label="Sous-activité">
          <button
            type="button"
            className={isGeneralSubActivity ? 'active' : ''}
            onClick={() => onSubActivityChange(null)}
          >
            Général
          </button>
          {subActivities.map(subActivity => (
            <button
              key={subActivity.name}
              type="button"
              className={selectedSubActivity === subActivity.name ? 'active' : ''}
              onClick={() => onSubActivityChange(subActivity)}
            >
              {subActivity.name}
            </button>
          ))}
        </div>
      )}
    </StepSection>
  );
}

ActivityStep.propTypes = {
  activities: PropTypes.array.isRequired,
  selectedActivityId: PropTypes.string.isRequired,
  selectedSubActivity: PropTypes.string.isRequired,
  onActivityChange: PropTypes.func.isRequired,
  onSubActivityChange: PropTypes.func.isRequired,
};

function TeamOptions({ teams, selectedTeamId, onTeamChange }) {
  return teams.map(team => (
    <OptionCard
      key={team._id}
      active={team._id === selectedTeamId}
      title={team.name}
      subtitle={`${team.members?.length || 0} membre${team.members?.length > 1 ? 's' : ''}`}
      initials="👥"
      onClick={() => onTeamChange(team._id)}
    />
  ));
}

TeamOptions.propTypes = {
  teams: PropTypes.array.isRequired,
  selectedTeamId: PropTypes.string.isRequired,
  onTeamChange: PropTypes.func.isRequired,
};

function MemberOptions({ members, selectedUserId, onUserChange }) {
  return members.map(member => (
    <OptionCard
      key={member.id}
      active={member.id === selectedUserId}
      title={member.name}
      subtitle={member.role}
      initials={member.initials}
      onClick={() => onUserChange(member.id)}
    />
  ));
}

MemberOptions.propTypes = {
  members: PropTypes.array.isRequired,
  selectedUserId: PropTypes.string.isRequired,
  onUserChange: PropTypes.func.isRequired,
};

function TargetChoices({ context, members, teams, selectedUserId, selectedTeamId, onUserChange, onTeamChange }) {
  if (context === 'team' && teams.length === 0) {
    return <EmptyState icon="👥" text={TEXT.noTeam} />;
  }

  if (context === 'individual' && members.length === 0) {
    return <EmptyState icon="◉" text={TEXT.noMember} />;
  }

  return (
    <div className="option-list compact">
      {context === 'team' ? (
        <TeamOptions teams={teams} selectedTeamId={selectedTeamId} onTeamChange={onTeamChange} />
      ) : (
        <MemberOptions members={members} selectedUserId={selectedUserId} onUserChange={onUserChange} />
      )}
    </div>
  );
}

TargetChoices.propTypes = {
  context: PropTypes.string.isRequired,
  members: PropTypes.array.isRequired,
  teams: PropTypes.array.isRequired,
  selectedUserId: PropTypes.string.isRequired,
  selectedTeamId: PropTypes.string.isRequired,
  onUserChange: PropTypes.func.isRequired,
  onTeamChange: PropTypes.func.isRequired,
};

function TargetStep({ context, members, teams, selectedUserId, selectedTeamId, onContextChange, onUserChange, onTeamChange }) {
  return (
    <StepSection number="02" title="Cible">
      <ContextToggle value={context} onChange={onContextChange} />

      <TargetChoices
        context={context}
        members={members}
        teams={teams}
        selectedUserId={selectedUserId}
        selectedTeamId={selectedTeamId}
        onUserChange={onUserChange}
        onTeamChange={onTeamChange}
      />
    </StepSection>
  );
}

TargetStep.propTypes = {
  context: PropTypes.string.isRequired,
  members: PropTypes.array.isRequired,
  teams: PropTypes.array.isRequired,
  selectedUserId: PropTypes.string.isRequired,
  selectedTeamId: PropTypes.string.isRequired,
  onContextChange: PropTypes.func.isRequired,
  onUserChange: PropTypes.func.isRequired,
  onTeamChange: PropTypes.func.isRequired,
};

function ScoreStep({ value, maxPossible, comments, onChange }) {
  const normalizedScore = getNormalizedScore(value, maxPossible);

  return (
    <StepSection number="03" title="Performance">
      <div className="score-input-grid">
        <label className="score-input-card" htmlFor="scoreValue">
          <span>Score</span>
          <input
            id="scoreValue"
            type="number"
            min="0"
            value={value}
            onChange={event => onChange('value', event.target.value)}
            placeholder="0"
          />
        </label>

        <label className="score-input-card" htmlFor="maxPossible">
          <span>Maximum</span>
          <input
            id="maxPossible"
            type="number"
            min="1"
            value={maxPossible}
            onChange={event => onChange('maxPossible', event.target.value)}
            placeholder="100"
          />
        </label>
      </div>

      <div className="normalized-score-card">
        <span>Score normalisé</span>
        <strong>{normalizedScore ?? '—'}%</strong>
      </div>

      <label className="form-group" htmlFor="comments">
        <span className="form-label">Commentaire</span>
        <textarea
          id="comments"
          className="form-textarea"
          rows={3}
          value={comments}
          onChange={event => onChange('comments', event.target.value)}
          placeholder={TEXT.commentPlaceholder}
        />
      </label>
    </StepSection>
  );
}

ScoreStep.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  maxPossible: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  comments: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

function SubmitPanel({ validationMessage, submitting }) {
  return (
    <div className="submit-panel">
      {validationMessage ? (
        <div className="submit-hint">{validationMessage}</div>
      ) : (
        <div className="submit-hint ready">Tout est prêt.</div>
      )}

      <button type="submit" className="btn btn-primary" disabled={Boolean(validationMessage) || submitting}>
        {submitting ? 'Envoi...' : 'Valider le score'}
      </button>
    </div>
  );
}

SubmitPanel.propTypes = {
  validationMessage: PropTypes.string,
  submitting: PropTypes.bool.isRequired,
};

export default function AddScore() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const { selectedGroupId, selectedGroup } = useGroup();
  const preselectedActivity = searchParams.get('activityId') || '';

  const [submitting, setSubmitting] = useState(false);
  const {
    form,
    setDefaultActivity,
    updateActivity,
    updateContext,
    updateField,
    updateSubActivity,
  } = useScoreForm(preselectedActivity);
  const { activities, teams, members, loading } = useScoreOptions(selectedGroupId, setDefaultActivity);

  const groupName = selectedGroup?.title || 'Groupe';
  const validationMessage = useMemo(() => getValidationMessage(form), [form]);

  const handleSubmit = async event => {
    event.preventDefault();

    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    setSubmitting(true);

    try {
      await api.addScore(buildScorePayload(form));
      triggerTelegramFeedback('success');
      toast.success(TEXT.success);
      setTimeout(() => navigate(-1), 800);
    } catch (error) {
      triggerTelegramFeedback('error');
      toast.error(error.message || TEXT.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  if (!selectedGroupId) return <NoGroupSelected />;

  if (loading) {
    return (
      <div className="page">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="page score-flow-page">
      <FlowHeader groupName={groupName} />

      <form className="score-flow-form slide-up-delay-1" onSubmit={handleSubmit}>
        <ActivityStep
          activities={activities}
          selectedActivityId={form.activityId}
          selectedSubActivity={form.subActivity}
          onActivityChange={updateActivity}
          onSubActivityChange={updateSubActivity}
        />

        <TargetStep
          context={form.context}
          members={members}
          teams={teams}
          selectedUserId={form.userId}
          selectedTeamId={form.teamId}
          onContextChange={updateContext}
          onUserChange={value => updateField('userId', value)}
          onTeamChange={value => updateField('teamId', value)}
        />

        <ScoreStep
          value={form.value}
          maxPossible={form.maxPossible}
          comments={form.comments}
          onChange={updateField}
        />

        <SubmitPanel validationMessage={validationMessage} submitting={submitting} />
      </form>
    </div>
  );
}
