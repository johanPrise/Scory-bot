import PropTypes from 'prop-types';

export default function ActivityTabs({ activeTab, setActiveTab, subActivitiesCount, scoresCount }) {
  return (
    <div className="activity-tabs slide-up-delay-1" aria-label="Sections de l'activité">
      <button
        type="button"
        className={activeTab === 'info' ? 'active' : ''}
        aria-pressed={activeTab === 'info'}
        onClick={() => setActiveTab('info')}
      >
        Info
      </button>
      <button
        type="button"
        className={activeTab === 'sub' ? 'active' : ''}
        aria-pressed={activeTab === 'sub'}
        onClick={() => setActiveTab('sub')}
      >
        Sous-activités <span>{subActivitiesCount}</span>
      </button>
      <button
        type="button"
        className={activeTab === 'scores' ? 'active' : ''}
        aria-pressed={activeTab === 'scores'}
        onClick={() => setActiveTab('scores')}
      >
        Scores <span>{scoresCount}</span>
      </button>
    </div>
  );
}

ActivityTabs.propTypes = {
  activeTab: PropTypes.oneOf(['info', 'sub', 'scores']).isRequired,
  setActiveTab: PropTypes.func.isRequired,
  subActivitiesCount: PropTypes.number.isRequired,
  scoresCount: PropTypes.number.isRequired,
};
