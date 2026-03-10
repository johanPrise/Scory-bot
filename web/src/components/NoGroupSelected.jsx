import { useGroup } from './GroupContext';

/**
 * Sélecteur de groupe interactif
 * Affiché quand aucun groupe n'est sélectionné — permet de choisir un groupe
 */
export default function NoGroupSelected() {
  const { groups, selectGroup, loading, refreshGroups } = useGroup();
  const hasGroups = groups && groups.length > 0;

  const haptic = (type = 'light') => {
    globalThis.Telegram?.WebApp?.HapticFeedback?.impactOccurred(type);
  };

  const handleSelectGroup = (chatId) => {
    haptic('medium');
    selectGroup(chatId);
  };

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="loading"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="page" style={{ padding: '20px' }}>
      <div className="page-header slide-up" style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🎯</div>
        <h1 className="page-title" style={{ fontSize: 22 }}>Scory</h1>
        <p style={{ fontSize: 14, color: 'var(--tg-theme-hint-color)', maxWidth: 300, margin: '8px auto 0' }}>
          {hasGroups
            ? 'Choisis un groupe pour voir ses activités, scores et classements.'
            : 'Ajoute le bot dans un groupe Telegram pour commencer.'
          }
        </p>
      </div>

      {hasGroups ? (
        <div className="slide-up-delay-1">
          <div className="section-header">
            <h2 className="section-title">💬 Tes groupes</h2>
          </div>

          {groups.map((group, i) => (
            <button
              key={group.chatId}
              className={`list-item slide-up-delay-${Math.min(i + 1, 3)}`}
              onClick={() => handleSelectGroup(group.chatId)}
              style={{
                width: '100%',
                cursor: 'pointer',
                border: 'none',
                background: 'var(--tg-theme-secondary-bg-color)',
                borderRadius: 12,
                padding: '14px 16px',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textAlign: 'left',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'var(--scory-gradient, linear-gradient(135deg, #6c63ff, #a855f7))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0, color: '#fff'
              }}>
                💬
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{
                  fontWeight: 600, fontSize: 15,
                  color: 'var(--tg-theme-text-color)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                }}>
                  {group.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', marginTop: 2 }}>
                  {[
                    group.stats?.activities && `${group.stats.activities} activités`,
                    group.stats?.scores && `${group.stats.scores} scores`,
                    group.stats?.teams && `${group.stats.teams} équipes`,
                  ].filter(Boolean).join(' · ') || 'Aucune donnée encore'}
                </div>
              </div>
              <div style={{ color: 'var(--tg-theme-hint-color)', fontSize: 22, flexShrink: 0 }}>›</div>
            </button>
          ))}
        </div>
      ) : (
        <div className="slide-up-delay-1" style={{ textAlign: 'center' }}>
          <div style={{
            padding: '20px',
            backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            borderRadius: 12,
            marginBottom: 16
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--tg-theme-text-color)', marginBottom: 8 }}>
              Comment commencer ?
            </div>
            <ol style={{
              fontSize: 13, color: 'var(--tg-theme-hint-color)',
              textAlign: 'left', paddingLeft: 20, margin: 0, lineHeight: 1.8
            }}>
              <li>Ajoute <b>@scory_fr_bot</b> dans un groupe Telegram</li>
              <li>Tape <code>/start</code> dans le groupe</li>
              <li>Reviens ici et actualise !</li>
            </ol>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => { haptic(); refreshGroups(); }}
            style={{ width: '100%' }}
          >
            🔄 Actualiser mes groupes
          </button>
        </div>
      )}
    </div>
  );
}
