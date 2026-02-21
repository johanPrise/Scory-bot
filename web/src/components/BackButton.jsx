import { useNavigate } from 'react-router-dom';

export default function BackButton({ fallback = '/' }) {
  const navigate = useNavigate();

  return (
    <button
      className="btn btn-secondary"
      style={{ marginBottom: 16, padding: '8px 16px', fontSize: 14 }}
      onClick={() => {
        globalThis.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
        navigate(fallback);
      }}
    >
      ← Retour
    </button>
  );
}
