import PropTypes from 'prop-types';

export default function LoadingSpinner({ label = 'Chargement...' }) {
  return (
    <div className="loading" role="status" aria-live="polite" aria-label={label}>
      <div className="spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

LoadingSpinner.propTypes = {
  label: PropTypes.string,
};
