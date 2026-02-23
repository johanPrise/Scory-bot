import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Home from './pages/Home';
import Activities from './pages/Activities';
import ActivityDetail from './pages/ActivityDetail';
import Rankings from './pages/Rankings';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import Profile from './pages/Profile';
import AddScore from './pages/AddScore';
import ScoreApproval from './pages/ScoreApproval';
import Help from './pages/Help';
import { ToastProvider } from './components/Toast';
import { GroupProvider } from './components/GroupContext';
import GroupSelector from './components/GroupSelector';
import * as api from './api';
import { getChatId } from './api';

function BottomNav() {

  const tabs = [
    { path: '/', icon: '🏠', label: 'Accueil' },
    { path: '/activities', icon: '📋', label: 'Activités' },
    { path: '/rankings', icon: '🏆', label: 'Classement' },
    { path: '/teams', icon: '👥', label: 'Équipes' },
    { path: '/profile', icon: '👤', label: 'Profil' },
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map(tab => (
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
  );
}

function App() {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    // Initialiser le Telegram WebApp
    const tg = globalThis.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand(); // Ouvrir en plein écran
      tg.enableClosingConfirmation(); // Confirmer avant de fermer

      // Appliquer les couleurs du thème
      document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#1a1a2e');
      document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#e0e0e0');
      document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#8888aa');
      document.documentElement.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color || '#6c63ff');
      document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#6c63ff');
      document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
      document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#16213e');
    }

    // Authentification automatique
    initAuth();

    // Initialiser le chatId depuis les query params (contexte Telegram)
    getChatId();
  }, []);

  const initAuth = async () => {
    try {
      // Si on a déjà un JWT valide, vérifier qu'il marche
      const existingToken = localStorage.getItem('scory_token');
      if (existingToken) {
        try {
          await api.getMe();
          setAuthReady(true);
          return;
        } catch {
          localStorage.removeItem('scory_token');
        }
      }

      // Sinon, essayer l'auth Telegram
      if (globalThis.Telegram?.WebApp?.initData) {
        await api.loginWithTelegram();
      }
    } catch (err) {
      console.warn('Auth init failed:', err.message);
    } finally {
      setAuthReady(true);
    }
  };

  if (!authReady) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="loading"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <GroupProvider>
          <GroupSelector />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/activities" element={<Activities />} />
            <Route path="/activities/:id" element={<ActivityDetail />} />
            <Route path="/rankings" element={<Rankings />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:id" element={<TeamDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/add-score" element={<AddScore />} />
            <Route path="/approval" element={<ScoreApproval />} />
            <Route path="/help" element={<Help />} />
          </Routes>
          <BottomNav />
        </GroupProvider>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
