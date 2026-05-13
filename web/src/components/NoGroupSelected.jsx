import { useGroup } from './GroupContext';
import LoadingSpinner from './LoadingSpinner';

function formatGroupStats(group) {
  return [
    group.stats?.activities && `${group.stats.activities} activités`,
    group.stats?.scores && `${group.stats.scores} scores`,
    group.stats?.teams && `${group.stats.teams} équipes`,
  ].filter(Boolean).join(' · ') || 'Aucune donnée encore';
}

function triggerHaptic(type = 'light') {
  globalThis.Telegram?.WebApp?.HapticFeedback?.impactOccurred(type);
}

export default function NoGroupSelected() {
  const { groups, selectGroup, loading, refreshGroups } = useGroup();
  const hasGroups = groups && groups.length > 0;

  const handleSelectGroup = chatId => {
    triggerHaptic('medium');
    selectGroup(chatId);
  };

  if (loading) {
    return (
      <div className="group-selection-loading">
        <LoadingSpinner label="Chargement des groupes..." />
      </div>
    );
  }

  return (
    <div className="page group-selection-page">
      <header className="group-selection-hero slide-up">
        <div className="group-selection-mark" aria-hidden="true">🎯</div>
        <h1>Scory</h1>
        <p>
          {hasGroups
            ? 'Choisis un groupe pour voir ses activités, scores et classements.'
            : 'Ajoute le bot dans un groupe Telegram pour commencer.'}
        </p>
      </header>

      {hasGroups ? (
        <section className="group-selection-list slide-up-delay-1" aria-label="Groupes disponibles">
          <div className="section-header">
            <h2 className="section-title">Tes groupes</h2>
          </div>

          {groups.map((group, index) => (
            <button
              key={group.chatId}
              type="button"
              className={`group-selection-card slide-up-delay-${Math.min(index + 1, 3)}`}
              onClick={() => handleSelectGroup(group.chatId)}
            >
              <span className="group-selection-icon" aria-hidden="true">💬</span>
              <span className="group-selection-body">
                <strong>{group.title}</strong>
                <small>{formatGroupStats(group)}</small>
              </span>
              <span className="group-selection-arrow" aria-hidden="true">›</span>
            </button>
          ))}
        </section>
      ) : (
        <section className="group-onboarding-panel slide-up-delay-1">
          <h2>Comment commencer ?</h2>
          <ol>
            <li>Ajoute <b>@scory_fr_bot</b> dans un groupe Telegram</li>
            <li>Tape <code>/start</code> dans le groupe</li>
            <li>Reviens ici et actualise</li>
          </ol>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              triggerHaptic();
              refreshGroups();
            }}
          >
            Actualiser mes groupes
          </button>
        </section>
      )}
    </div>
  );
}
