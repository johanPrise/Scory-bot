import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as api from '../api';
import { BackButton, LoadingSpinner, EmptyState, NoGroupSelected } from '../components';
import { useToast } from '../components/Toast';
import { useGroup } from '../components/GroupContext';

const TEXT = {
  title: 'Ajouter un score',
  subtitle: 'Enregistrez un nouveau score',
  activity: 'Activité *',
  chooseActivity: '— Choisir une activité —',
  subActivity: 'Sous-activité',
  noSubActivity: '— Aucune —',
  context: 'Contexte *',
  individual: '👤 Individuel',
  team: '👥 Équipe',
  teamLabel: 'Équipe *',
  chooseTeam: '— Choisir une équipe —',
  noTeam: 'Aucune équipe disponible',
  score: 'Score *',
  maxScore: 'Score max *',
  normalizedScore: 'Score normalisé :',
  comments: 'Commentaires',
  commentsPlaceholder: 'Notes, remarques...',
  submitting: '⏳ Envoi...',
  submit: '✅ Ajouter le score',
  success: 'Score ajouté avec succès !',
  requiredFields: 'Veuillez remplir tous les champs obligatoires',
  teamRequired: 'Veuillez choisir une équipe',
  submitError: "Erreur lors de l'ajout du score",
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

const selectStyle = {
  ...inputStyle,
  appearance: 'none',
  WebkitAppearance: 'none',
};

const labelStyle = {
  fontSize: 13,
  color: 'var(--tg-theme-hint-color)',
  display: 'block',
  marginBottom: 4,
};

const fieldsetStyle = {
  border: 0,
  margin: 0,
  padding: 0,
};

const initialForm = activityId => ({
  activityId,
  subActivity: '',
  value: '',
  maxPossible: '100',
  context: 'individual',
  teamId: '',
  comments: '',
});

function getValidationMessage(form) {
  const hasRequiredFields =
    form.activityId &&
    form.value &&
    form.maxPossible &&
    form.context;

  if (!hasRequiredFields) {
    return TEXT.requiredFields;
  }

  const isMissingTeamId = form.context === 'team' && !form.teamId;
  if (isMissingTeamId) {
    return TEXT.teamRequired;
  }

  return null;
}

function isValidScoreCalculation(score, max) {
  const hasFiniteScore = Number.isFinite(score);
  const hasFiniteMax = Number.isFinite(max);
  const hasPositiveMax = max > 0;

  return hasFiniteScore && hasFiniteMax && hasPositiveMax;
}

function isTeamScoreWithId(form) {
  return form.context === 'team' && Boolean(form.teamId);
}

function buildScorePayload(form) {
  const payload = {
    activityId: form.activityId,
    value: Number(form.value),
    maxPossible: Number(form.maxPossible),
    context: form.context,
    comments: form.comments || undefined,
  };

  if (form.subActivity) {
    payload.subActivity = form.subActivity;
  }

  if (isTeamScoreWithId(form)) {
    payload.teamId = form.teamId;
  }

  return payload;
}

function getNormalizedScore(value, maxPossible) {
  if (!value || !maxPossible) return null;

  const score = Number(value);
  const max = Number(maxPossible);

  if (!isValidScoreCalculation(score, max)) {
    return null;
  }

  return ((score / max) * 100).toFixed(1);
}

function triggerTelegramFeedback(type) {
  globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
}

function FormCard({ children, marginBottom = 12 }) {
  return (
    <div className="card" style={{ marginBottom }}>
      {children}
    </div>
  );
}

FormCard.propTypes = {
  children: PropTypes.node.isRequired,
  marginBottom: PropTypes.number,
};

function ActivitySelect({ activities, value, onChange }) {
  return (
    <FormCard>
      <label htmlFor="activityId" style={labelStyle}>
        {TEXT.activity}
      </label>

      <select
        id="activityId"
        value={value}
        onChange={event => onChange(event.target.value)}
        required
        style={selectStyle}
      >
        <option value="">{TEXT.chooseActivity}</option>

        {activities.map(activity => (
          <option key={activity._id} value={activity._id}>
            {activity.name}
          </option>
        ))}
      </select>
    </FormCard>
  );
}

ActivitySelect.propTypes = {
  activities: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

function SubActivitySelect({ selectedActivity, value, onChange }) {
  const subActivities = selectedActivity?.subActivities || [];

  if (subActivities.length === 0) {
    return null;
  }

  return (
    <FormCard>
      <label htmlFor="subActivity" style={labelStyle}>
        {TEXT.subActivity}
      </label>

      <select
        id="subActivity"
        value={value}
        onChange={event => onChange(event.target.value)}
        style={selectStyle}
      >
        <option value="">{TEXT.noSubActivity}</option>

        {subActivities.map(subActivity => (
          <option key={subActivity.name} value={subActivity.name}>
            {subActivity.name} (/{subActivity.maxScore || 100})
          </option>
        ))}
      </select>
    </FormCard>
  );
}

SubActivitySelect.propTypes = {
  selectedActivity: PropTypes.shape({
    subActivities: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        maxScore: PropTypes.number,
      })
    ),
  }),
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

function ContextSelector({ value, onChange }) {
  return (
    <FormCard>
      <fieldset style={fieldsetStyle}>
        <legend style={labelStyle}>{TEXT.context}</legend>

        <div className="chips-row" style={{ marginBottom: 0, paddingBottom: 0 }}>
          <button
            type="button"
            className={`chip ${value === 'individual' ? 'active' : ''}`}
            aria-pressed={value === 'individual'}
            onClick={() => onChange('individual')}
          >
            {TEXT.individual}
          </button>

          <button
            type="button"
            className={`chip ${value === 'team' ? 'active' : ''}`}
            aria-pressed={value === 'team'}
            onClick={() => onChange('team')}
          >
            {TEXT.team}
          </button>
        </div>
      </fieldset>
    </FormCard>
  );
}

ContextSelector.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

function TeamSelect({ context, teams, value, onChange }) {
  if (context !== 'team') {
    return null;
  }

  return (
    <FormCard>
      <label htmlFor="teamId" style={labelStyle}>
        {TEXT.teamLabel}
      </label>

      {teams.length > 0 ? (
        <select
          id="teamId"
          value={value}
          onChange={event => onChange(event.target.value)}
          required
          style={selectStyle}
        >
          <option value="">{TEXT.chooseTeam}</option>

          {teams.map(team => (
            <option key={team._id} value={team._id}>
              {team.name}
            </option>
          ))}
        </select>
      ) : (
        <EmptyState icon="👥" text={TEXT.noTeam} />
      )}
    </FormCard>
  );
}

TeamSelect.propTypes = {
  context: PropTypes.string.isRequired,
  teams: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

function ScoreFields({ value, maxPossible, onChange }) {
  const normalizedScore = getNormalizedScore(value, maxPossible);

  return (
    <FormCard>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="scoreValue" style={labelStyle}>
            {TEXT.score}
          </label>

          <input
            id="scoreValue"
            type="number"
            value={value}
            onChange={event => onChange('value', event.target.value)}
            placeholder="0"
            min="0"
            required
            style={inputStyle}
          />
        </div>

        <div style={{ flex: 1 }}>
          <label htmlFor="maxPossible" style={labelStyle}>
            {TEXT.maxScore}
          </label>

          <input
            id="maxPossible"
            type="number"
            value={maxPossible}
            onChange={event => onChange('maxPossible', event.target.value)}
            placeholder="100"
            min="1"
            required
            style={inputStyle}
          />
        </div>
      </div>

      {normalizedScore && (
        <div
          style={{
            textAlign: 'center',
            marginTop: 10,
            padding: '8px 0',
            fontSize: 14,
            color: 'var(--tg-theme-hint-color)',
          }}
        >
          {TEXT.normalizedScore}{' '}
          <strong style={{ color: 'var(--tg-theme-accent-text-color)' }}>
            {normalizedScore}%
          </strong>
        </div>
      )}
    </FormCard>
  );
}

ScoreFields.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  maxPossible: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
};

function CommentsField({ value, onChange }) {
  return (
    <FormCard marginBottom={16}>
      <label htmlFor="comments" style={labelStyle}>
        {TEXT.comments}
      </label>

      <textarea
        id="comments"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={TEXT.commentsPlaceholder}
        rows={2}
        style={{ ...inputStyle, resize: 'none' }}
      />
    </FormCard>
  );
}

CommentsField.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

function SubmitButton({ submitting }) {
  return (
    <button type="submit" className="btn btn-primary" disabled={submitting}>
      {submitting ? TEXT.submitting : TEXT.submit}
    </button>
  );
}

SubmitButton.propTypes = {
  submitting: PropTypes.bool.isRequired,
};

export default function AddScore() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const { selectedGroupId } = useGroup();

  const preselectedActivity = searchParams.get('activityId') || '';

  const [activities, setActivities] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(() => initialForm(preselectedActivity));

  const selectedActivity = useMemo(() => {
    return activities.find(activity => activity._id === form.activityId) || null;
  }, [activities, form.activityId]);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      const [activityResult, teamResult] = await Promise.allSettled([
        api.getActivities({ limit: 100, includeSubActivities: 'true' }),
        api.getTeams(),
      ]);

      if (activityResult.status === 'fulfilled') {
        setActivities(activityResult.value.activities || []);
      }

      if (teamResult.status === 'fulfilled') {
        setTeams(teamResult.value.teams || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedGroupId) return;

    loadData();
  }, [selectedGroupId, loadData]);

  const updateField = (field, value) => {
    setForm(currentForm => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const updateActivity = activityId => {
    setForm(currentForm => ({
      ...currentForm,
      activityId,
      subActivity: '',
    }));
  };

  const updateContext = context => {
    setForm(currentForm => ({
      ...currentForm,
      context,
      teamId: context === 'individual' ? '' : currentForm.teamId,
    }));
  };

  const handleSubmit = async event => {
    event.preventDefault();

    const validationMessage = getValidationMessage(form);

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

  if (!selectedGroupId) {
    return <NoGroupSelected />;
  }

  if (loading) {
    return (
      <div className="page">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header slide-up">
        <BackButton fallback="/activities" />
        <h1 className="page-title">{TEXT.title}</h1>
        <div className="page-subtitle">{TEXT.subtitle}</div>
      </div>

      <form onSubmit={handleSubmit} className="slide-up-delay-1">
        <ActivitySelect
          activities={activities}
          value={form.activityId}
          onChange={updateActivity}
        />

        <SubActivitySelect
          selectedActivity={selectedActivity}
          value={form.subActivity}
          onChange={value => updateField('subActivity', value)}
        />

        <ContextSelector value={form.context} onChange={updateContext} />

        <TeamSelect
          context={form.context}
          teams={teams}
          value={form.teamId}
          onChange={value => updateField('teamId', value)}
        />

        <ScoreFields
          value={form.value}
          maxPossible={form.maxPossible}
          onChange={updateField}
        />

        <CommentsField
          value={form.comments}
          onChange={value => updateField('comments', value)}
        />

        <SubmitButton submitting={submitting} />
      </form>
    </div>
  );
}