import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';

export default function BackButton({ fallback = '/' }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="back-button"
      onClick={() => {
        globalThis.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
        navigate(fallback);
      }}
    >
      ← Retour
    </button>
  );
}

BackButton.propTypes = {
  fallback: PropTypes.string,
};
