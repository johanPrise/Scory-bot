import PropTypes from 'prop-types';

export default function EmptyState({ icon = '📋', text = 'Aucun élément' }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">{icon}</div>
      <div className="empty-state-text">{text}</div>
    </div>
  );
}

EmptyState.propTypes = {
  icon: PropTypes.node,
  text: PropTypes.string,
};
