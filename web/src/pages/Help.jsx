import { BackButton } from '../components';

const sections = [
  {
    title: '🏠 Accueil',
    items: [
      'Consultez vos statistiques personnelles (points, activités, rang)',
      'Voyez vos scores récents et le Top 3 du classement',
    ]
  },
  {
    title: '📋 Activités',
    items: [
      'Listez toutes les activités disponibles',
      'Créez une nouvelle activité (nom, description, type)',
      'Consultez le détail d\'une activité (participants, scores, sous-activités)',
      'Ajoutez des sous-activités à une activité existante',
    ]
  },
  {
    title: '🎯 Scores',
    items: [
      'Ajoutez un score depuis la page d\'une activité ou via le bouton « + Score »',
      'Choisissez le contexte : individuel ou équipe',
      'Les scores sont soumis en attente d\'approbation par un admin',
      'Consultez votre historique de scores dans votre profil',
    ]
  },
  {
    title: '🏆 Classement',
    items: [
      'Filtrez par période : jour, semaine, mois, année, tout',
      'Basculez entre classement individuel et par équipe',
      'Filtrez par activité spécifique',
    ]
  },
  {
    title: '👥 Équipes',
    items: [
      'Créez une équipe et partagez le code d\'invitation',
      'Rejoignez une équipe en entrant son code',
      'Consultez les membres et statistiques de chaque équipe',
    ]
  },
  {
    title: '👤 Profil',
    items: [
      'Modifiez vos informations (prénom, nom)',
      'Vérifiez que votre compte Telegram est lié',
      'Consultez vos statistiques personnelles détaillées',
    ]
  },
  {
    title: '🤖 Commandes Bot',
    items: [
      '/start — Démarrer et lier votre compte',
      '/help — Afficher l\'aide',
      '/score — Ajouter un score',
      '/ranking — Voir le classement',
      '/activities — Lister les activités',
      '/createactivity — Créer une activité',
      '/createteam — Créer une équipe',
      '/dashboard — Ouvrir le tableau de bord web',
      '/app — Ouvrir l\'application complète',
    ]
  }
];

export default function Help() {
  return (
    <div className="page">
      <div className="page-header slide-up">
        <BackButton fallback="/" />
        <h1 className="page-title">Aide</h1>
        <div className="page-subtitle">Comment utiliser Scory</div>
      </div>

      {sections.map((section, i) => (
        <div key={section.title} className={`slide-up-delay-${Math.min(i + 1, 3)}`} style={{ marginBottom: 16 }}>
          <div className="section-header">
            <h2 className="section-title">{section.title}</h2>
          </div>
          <div className="card">
            {section.items.map((item) => (
              <div
                key={item}
                style={{
                  padding: '8px 0',
                  borderBottom: section.items.indexOf(item) < section.items.length - 1 ? '1px solid var(--scory-card-border)' : 'none',
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: 'var(--tg-theme-text-color)',
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="slide-up-delay-3" style={{ marginTop: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
          Scory Bot v1.0 — Système de scoring collaboratif
        </div>
      </div>
    </div>
  );
}
