import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import GroupSelector from './GroupSelector';

const NAV_ITEMS = [
  { path: '/', icon: '⌂', label: 'Dashboard' },
  { path: '/rankings', icon: '🏆', label: 'Scoreboard' },
  { path: '/activities', icon: '▦', label: 'Activités' },
  { path: '/profile', icon: '◉', label: 'Profil' },
];

const ACTIONS = [
  {
    path: '/add-score',
    icon: '🎯',
    title: 'Ajouter un score',
    subtitle: 'Saisir une performance',
  },
  {
    path: '/activities',
    icon: '+',
    title: 'Créer une activité',
    subtitle: 'Préparer un nouveau défi',
  },
  {
    path: '/teams',
    icon: '👥',
    title: 'Gérer les équipes',
    subtitle: 'Créer ou organiser',
  },
  {
    path: '/approval',
    icon: '✓',
    title: 'Approbations',
    subtitle: 'Valider les scores',
  },
];

function ActionSheet({ open, onClose, onNavigate }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return undefined;

    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }

    return () => {
      if (dialog.open && typeof dialog.close === 'function') {
        dialog.close();
      }
      dialog.removeAttribute('open');
    };
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="action-sheet-dialog"
      aria-label="Actions rapides"
      onCancel={onClose}
    >
      <button
        type="button"
        className="action-sheet-backdrop-button"
        onClick={onClose}
        aria-label="Fermer les actions rapides"
      />
      <div className="action-sheet">
        <div className="action-sheet-handle" />
        <div className="action-sheet-header">
          <div>
            <div className="action-sheet-eyebrow">Action rapide</div>
            <h2 className="action-sheet-title">Que veux-tu faire ?</h2>
          </div>
          <button
            type="button"
            className="action-sheet-close"
            onClick={onClose}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <div className="action-sheet-grid">
          {ACTIONS.map(action => (
            <button
              key={action.path}
              type="button"
              className="action-sheet-item"
              onClick={() => onNavigate(action.path)}
            >
              <span className="action-sheet-icon">{action.icon}</span>
              <span>
                <span className="action-sheet-item-title">{action.title}</span>
                <span className="action-sheet-item-subtitle">{action.subtitle}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </dialog>
  );
}

ActionSheet.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onNavigate: PropTypes.func.isRequired,
};

export default function AppShell({ children }) {
  const navigate = useNavigate();
  const [actionsOpen, setActionsOpen] = useState(false);

  const openActions = () => {
    globalThis.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    setActionsOpen(true);
  };

  const closeActions = () => setActionsOpen(false);

  const navigateFromSheet = (path) => {
    closeActions();
    navigate(path);
  };

  return (
    <>
      <GroupSelector />
      <main className="app-main">{children}</main>

      <nav className="bottom-nav" aria-label="Navigation principale">
        {NAV_ITEMS.slice(0, 2).map(tab => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}

        <button
          type="button"
          className="nav-action-button"
          onClick={openActions}
          aria-label="Ouvrir les actions rapides"
        >
          +
        </button>

        {NAV_ITEMS.slice(2).map(tab => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <ActionSheet
        open={actionsOpen}
        onClose={closeActions}
        onNavigate={navigateFromSheet}
      />
    </>
  );
}

AppShell.propTypes = {
  children: PropTypes.node.isRequired,
};
