export default function EmptyState({ icon = '📋', text = 'Aucun élément' }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-text">{text}</div>
    </div>
  );
}
