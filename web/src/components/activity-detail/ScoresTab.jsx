import PropTypes from 'prop-types';
import { ListItem, EmptyState } from '../index';

export default function ScoresTab({ scores, handleDeleteScore }) {
  if (scores.length === 0) return <EmptyState icon="📋" text="Aucun score pour cette activité" />;

  return (
    <div>
      {scores.map((score, i) => (
        <ListItem
          key={score._id || `score-${score.createdAt}-${i}`}
          icon="🎯"
          title={
            (score.user?.username || score.user?.firstName || 'Utilisateur') +
            (score.subActivity ? ` · ${score.subActivity}` : '')
          }
          subtitle={
            new Date(score.createdAt).toLocaleDateString('fr-FR') +
            (score.team ? ` · ${score.team.name}` : '')
          }
          value={`${score.value}/${score.maxPossible}`}
          trailing={
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteScore(score._id); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4, opacity: 0.6 }}
              title="Supprimer"
            >
              🗑
            </button>
          }
        />
      ))}
    </div>
  );
}

ScoresTab.propTypes = {
  scores: PropTypes.array.isRequired,
  handleDeleteScore: PropTypes.func.isRequired,
};
