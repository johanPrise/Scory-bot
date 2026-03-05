import { useGroup } from './GroupContext';

/**
 * Sélecteur de groupe Telegram
 * Affiché en haut de l'app pour permettre à l'utilisateur de filtrer par groupe
 */
export default function GroupSelector() {
  const { groups, selectedGroupId, selectGroup, loading } = useGroup();

  // Ne pas afficher si pas de groupes
  if (loading || groups.length === 0) return null;

  const haptic = () => {
    globalThis.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
  };

  return (
    <div className="group-selector">
      <div className="group-selector-inner">
        {groups.map(group => (
          <button
            key={group.chatId}
            className={`group-chip ${selectedGroupId === group.chatId ? 'active' : ''}`}
            onClick={() => { haptic(); selectGroup(group.chatId); }}
            title={group.title}
          >
            💬 {group.title.length > 15 ? group.title.slice(0, 15) + '…' : group.title}
            {group.stats && (
              <span className="group-chip-badge">{group.stats.scores}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
