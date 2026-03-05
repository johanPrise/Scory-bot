import { useGroup } from './GroupContext';

/**
 * Message affiché quand aucun groupe n'est sélectionné
 * Bloque l'affichage des données jusqu'à ce qu'un groupe soit choisi
 */
export default function NoGroupSelected() {
  const { groups } = useGroup();
  const hasGroups = groups && groups.length > 0;

  return (
    <div className="page" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center',
      padding: '20px'
    }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>💬</div>
      <h2 style={{ 
        fontSize: 20, 
        fontWeight: 600, 
        marginBottom: 8,
        color: 'var(--tg-theme-text-color)'
      }}>
        Aucun groupe sélectionné
      </h2>
      <p style={{ 
        fontSize: 14, 
        color: 'var(--tg-theme-hint-color)',
        marginBottom: 24,
        maxWidth: 300
      }}>
        {hasGroups 
          ? "Veuillez sélectionner un groupe Telegram pour accéder aux données. Chaque groupe a ses propres activités, scores et classements."
          : "Vous devez d'abord rejoindre un groupe Telegram avec le bot Scory pour commencer à utiliser l'application."
        }
      </p>
      <div style={{
        padding: '12px 16px',
        backgroundColor: 'var(--tg-theme-secondary-bg-color)',
        borderRadius: 8,
        fontSize: 13,
        color: 'var(--tg-theme-hint-color)'
      }}>
        {hasGroups 
          ? "💡 Astuce : Utilisez le sélecteur en haut pour choisir un groupe"
          : "💡 Astuce : Ajoutez le bot à un groupe Telegram et utilisez /start"
        }
      </div>
    </div>
  );
}
