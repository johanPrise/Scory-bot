import PropTypes from 'prop-types';
import EmptyState from '../EmptyState';
import LoadingSpinner from '../LoadingSpinner';

const optionShape = PropTypes.shape({
  value: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
});

const activityShape = PropTypes.shape({
  _id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
});

const rankingItemShape = PropTypes.shape({
  userId: PropTypes.string,
  teamId: PropTypes.string,
  name: PropTypes.string,
  username: PropTypes.string,
  firstName: PropTypes.string,
  lastName: PropTypes.string,
  totalScore: PropTypes.number,
  scoreCount: PropTypes.number,
  averageScore: PropTypes.number,
});

function getRankName(item, scope) {
  if (scope === 'team') return item.name || 'Équipe';

  const fullName = `${item.firstName || ''} ${item.lastName || ''}`.trim();
  return item.username || fullName || 'Joueur';
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

function formatAverage(value) {
  return Math.round(value || 0);
}

export function ScoreboardHeader({ groupName, total, leaderName }) {
  return (
    <section className="scoreboard-hero slide-up">
      <div>
        <div className="dashboard-eyebrow">Scoreboard</div>
        <h1 className="scoreboard-title">{groupName}</h1>
        <p className="scoreboard-subtitle">Classement vivant du groupe.</p>
      </div>
      <div className="scoreboard-summary">
        <span>{total} entrée{total > 1 ? 's' : ''}</span>
        <strong>{leaderName || '—'}</strong>
      </div>
    </section>
  );
}

ScoreboardHeader.propTypes = {
  groupName: PropTypes.string.isRequired,
  total: PropTypes.number.isRequired,
  leaderName: PropTypes.string.isRequired,
};

export function SegmentControl({ label, options, value, onChange }) {
  return (
    <div className="scoreboard-filter-group" aria-label={label}>
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? 'active' : ''}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

SegmentControl.propTypes = {
  label: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(optionShape).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export function ActivityFilter({ activities, value, onChange }) {
  if (activities.length === 0) return null;

  return (
    <label className="scoreboard-select-wrap" htmlFor="rankingActivity">
      <span>Activité</span>
      <select
        id="rankingActivity"
        value={value}
        onChange={event => onChange(event.target.value)}
      >
        <option value="">Toutes les activités</option>
        {activities.map(activity => (
          <option key={activity._id} value={activity._id}>{activity.name}</option>
        ))}
      </select>
    </label>
  );
}

ActivityFilter.propTypes = {
  activities: PropTypes.arrayOf(activityShape).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

function PodiumCard({ item, rank, scope }) {
  if (!item) return null;

  const name = getRankName(item, scope);

  return (
    <article className={`podium-card podium-${rank}`}>
      <div className="podium-rank">#{rank}</div>
      <div className="podium-avatar">{getInitials(name)}</div>
      <h2>{name}</h2>
      <div className="podium-score">{item.totalScore || 0}</div>
      <p>
        {item.scoreCount || 0} score{item.scoreCount > 1 ? 's' : ''} · Moy. {formatAverage(item.averageScore)}
      </p>
    </article>
  );
}

PodiumCard.propTypes = {
  item: rankingItemShape,
  rank: PropTypes.number.isRequired,
  scope: PropTypes.string.isRequired,
};

function Podium({ rankings, scope }) {
  const podium = [rankings[1], rankings[0], rankings[2]];
  const ranks = [2, 1, 3];

  return (
    <section className="podium-grid slide-up-delay-2" aria-label="Podium">
      {podium.map((item, index) => (
        <PodiumCard
          key={item?.userId || item?.teamId || ranks[index]}
          item={item}
          rank={ranks[index]}
          scope={scope}
        />
      ))}
    </section>
  );
}

Podium.propTypes = {
  rankings: PropTypes.arrayOf(rankingItemShape).isRequired,
  scope: PropTypes.string.isRequired,
};

function RankingRow({ item, rank, scope }) {
  const name = getRankName(item, scope);

  return (
    <div className="scoreboard-row">
      <div className="scoreboard-rank">#{rank}</div>
      <div className="scoreboard-avatar">{getInitials(name)}</div>
      <div className="scoreboard-player">
        <div className="list-item-title">{name}</div>
        <div className="list-item-subtitle">
          {item.scoreCount || 0} score{item.scoreCount > 1 ? 's' : ''} · Moyenne {formatAverage(item.averageScore)}
        </div>
      </div>
      <div className="scoreboard-points">
        <strong>{item.totalScore || 0}</strong>
        <span>pts</span>
      </div>
    </div>
  );
}

RankingRow.propTypes = {
  item: rankingItemShape.isRequired,
  rank: PropTypes.number.isRequired,
  scope: PropTypes.string.isRequired,
};

export function RankingResults({ loading, rankings, scope }) {
  if (loading) {
    return <LoadingSpinner />;
  }

  if (rankings.length > 0) {
    return (
      <>
        <Podium rankings={rankings} scope={scope} />

        <section className="scoreboard-list slide-up-delay-3" aria-label="Classement complet">
          <div className="section-header">
            <h2 className="section-title">Classement complet</h2>
          </div>

          {rankings.map((item, index) => (
            <RankingRow
              key={item.userId || item.teamId || index}
              item={item}
              rank={index + 1}
              scope={scope}
            />
          ))}
        </section>
      </>
    );
  }

  return <EmptyState icon="🏆" text="Pas encore de classement pour ces filtres." />;
}

RankingResults.propTypes = {
  loading: PropTypes.bool.isRequired,
  rankings: PropTypes.arrayOf(rankingItemShape).isRequired,
  scope: PropTypes.string.isRequired,
};
