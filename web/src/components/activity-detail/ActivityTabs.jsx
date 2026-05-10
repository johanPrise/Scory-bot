import PropTypes from 'prop-types';

export default function ActivityTabs({ activeTab, setActiveTab, subActivitiesCount, scoresCount }) {
  return (
    <div className="chips-row slide-up-delay-1">
      <button className={`chip ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>
        📋 Info
      </button>
      {subActivitiesCount > 0 && (
        <button className={`chip ${activeTab === 'sub' ? 'active' : ''}`} onClick={() => setActiveTab('sub')}>
          📦 Sous-activités ({subActivitiesCount})
        </button>
      )}
      <button className={`chip ${activeTab === 'scores' ? 'active' : ''}`} onClick={() => setActiveTab('scores')}>
        🏅 Scores ({scoresCount})
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
