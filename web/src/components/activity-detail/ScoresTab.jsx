import PropTypes from 'prop-types';
import { ListItem, EmptyState } from '../index';

function formatScoreDate(createdAt) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return 'Date inconnue';
  }

  return date.toLocaleDateString('fr-FR');
}

function formatScoreValue(value, maxPossible) {
  if (value == null || maxPossible == null) {
    return 'Score inconnu';
  }

  return `${value}/${maxPossible}`;
}

function getScoreId(score) {
  return score._id || score.id;
}

function getScoreOwner(score) {
  return score.user?.username || score.user?.firstName || score.team?.name || 'Participant inconnu';
}

function getScoreTitle(score) {
  return getScoreOwner(score) + (score.subActivity ? ` · ${score.subActivity}` : '');
}

function getScoreSubtitle(score) {
  const parts = [formatScoreDate(score.createdAt)];

  if (score.user && score.team?.name) {
    parts.push(score.team.name);
  }

  return parts.join(' · ');
}

export default function ScoresTab({ scores, scoresError, handleDeleteScore }) {
  if (scoresError) return <EmptyState icon="⚠️" text={scoresError.message || 'Impossible de charger les scores'} />;
  if (scores.length === 0) return <EmptyState icon="📋" text="Aucun score pour cette activité" />;

  return (
    <div>
      {scores.map((score, i) => {
        const scoreId = getScoreId(score);

        return (
          <ListItem
            key={scoreId || `score-${score.createdAt || 'unknown'}-${i}`}
            icon="🎯"
            title={getScoreTitle(score)}
            subtitle={getScoreSubtitle(score)}
            value={formatScoreValue(score.value, score.maxPossible)}
            trailing={
              <button
                type="button"
                className="score-delete-button"
                disabled={!scoreId}
                onClick={(e) => {
                  e.stopPropagation();
                  if (scoreId) handleDeleteScore(scoreId);
                }}
                title="Supprimer"
                aria-label="Supprimer ce score"
              >
                🗑
              </button>
            }
          />
        );
      })}
    </div>
  );
}

const userShape = PropTypes.shape({
  username: PropTypes.string,
  firstName: PropTypes.string,
});

const teamShape = PropTypes.shape({
  name: PropTypes.string,
});

ScoresTab.propTypes = {
  scores: PropTypes.arrayOf(PropTypes.shape({
    _id: PropTypes.string,
    id: PropTypes.string,
    createdAt: PropTypes.string,
    maxPossible: PropTypes.number,
    subActivity: PropTypes.string,
    team: teamShape,
    user: userShape,
    value: PropTypes.number,
  })).isRequired,
  scoresError: PropTypes.shape({
    message: PropTypes.string,
  }),
  handleDeleteScore: PropTypes.func.isRequired,
};
