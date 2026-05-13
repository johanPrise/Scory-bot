import PropTypes from 'prop-types';
import { BackButton } from '../components';

const sections = [
  {
    eyebrow: 'Vue',
    title: 'Accueil',
    items: [
      'Consultez vos points, votre rang et les scores récents.',
      'Accédez vite au scoreboard et à la saisie de score.',
    ],
  },
  {
    eyebrow: 'Catalogue',
    title: 'Activités',
    items: [
      'Créez une activité avec type, description et variantes.',
      "Ajoutez des sous-activités pour gérer plusieurs épreuves.",
      "Ouvrez le détail pour suivre les scores d'une activité.",
    ],
  },
  {
    eyebrow: 'Saisie',
    title: 'Scores',
    items: [
      'Choisissez une activité, un joueur ou une équipe.',
      'Indiquez le score obtenu et le maximum possible.',
      'Les scores passent en validation quand une approbation admin est requise.',
    ],
  },
  {
    eyebrow: 'Compétition',
    title: 'Classement',
    items: [
      'Filtrez par période, type de classement et activité.',
      'Comparez les joueurs ou les équipes du groupe.',
    ],
  },
  {
    eyebrow: 'Collectif',
    title: 'Équipes',
    items: [
      "Créez une équipe et partagez son code d'invitation.",
      'Rejoignez une équipe depuis un code.',
      'Consultez membres, points, activités et capacité.',
    ],
  },
  {
    eyebrow: 'Bot',
    title: 'Commandes',
    items: [
      '/start — Démarrer et lier votre compte',
      '/help — Afficher l’aide',
      '/score — Ajouter un score',
      '/ranking — Voir le classement',
      '/activities — Lister les activités',
      '/createactivity — Créer une activité',
      '/createteam — Créer une équipe',
      '/app — Ouvrir l’application complète',
    ],
  },
];

function HelpHero() {
  return (
    <section className="help-hero slide-up">
      <div>
        <BackButton fallback="/" />
        <div className="dashboard-eyebrow">Guide</div>
        <h1 className="help-title">Aide</h1>
        <p className="help-subtitle">Les repères utiles pour piloter Scory sans friction.</p>
      </div>
      <div className="help-hero-meter" aria-label={`${sections.length} sections d'aide`}>
        <span>Sections</span>
        <strong>{sections.length}</strong>
      </div>
    </section>
  );
}

function HelpSection({ section, index }) {
  return (
    <article className={`help-section slide-up-delay-${Math.min(index + 1, 3)}`}>
      <div className="help-section-header">
        <span>{section.eyebrow}</span>
        <h2>{section.title}</h2>
      </div>
      <div className="help-section-list">
        {section.items.map(item => (
          <div className="help-row" key={item}>
            <span aria-hidden="true">✓</span>
            <p>{item}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

HelpSection.propTypes = {
  section: PropTypes.shape({
    eyebrow: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    items: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  index: PropTypes.number.isRequired,
};

export default function Help() {
  return (
    <div className="page help-page">
      <HelpHero />

      <section className="help-grid" aria-label="Guide Scory">
        {sections.map((section, index) => (
          <HelpSection key={section.title} section={section} index={index} />
        ))}
      </section>

      <footer className="help-footer">Scory Bot v1.0 · Système de scoring collaboratif</footer>
    </div>
  );
}
