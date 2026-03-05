import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';
import { LoadingSpinner, EmptyState, StatCard, ListItem, NoGroupSelected } from '../components';
import { useGroup } from '../components/GroupContext';

export default function Home() {
  const navigate = useNavigate();
  const { selectedGroupId, selectedGroup } = useGroup();
  const user = globalThis.Telegram?.WebApp?.initDataUnsafe?.user || null;
  const [stats, setStats] = useState({ totalScores: 0, totalActivities: 0, rank: '—' });
  const [recentScores, setRecentScores] = useState([]);
  const [topRanking, setTopRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedGroupId) {
      loadDashboard();
    }
  }, [selectedGroupId]);

  const loadDashboard = async () => {
    try {
      const [personalRes, rankingRes, dashboardRes] = await Promise.allSettled([
        api.getPersonalScores({ limit: 5 }),
        api.getRankings({ scope: 'individual', limit: 3 }),
        api.getDashboard({ period: 'month' })
      ]);

      if (personalRes.status === 'fulfilled') {
        const data = personalRes.value;
        setRecentScores(data.scores || []);
        setStats(prev => ({
          ...prev,
          totalScores: data.personalStats?.totalPoints || 0,
          totalActivities: data.personalStats?.totalScores || 0
        }));
      }

      if (dashboardRes.status === 'fulfilled') {
        const dashData = dashboardRes.value;
        const ranking = dashData.stats?.personal?.ranking;
        if (ranking?.position) {
          setStats(prev => ({
            ...prev,
            rank: `#${ranking.position}`,
            totalScores: dashData.stats?.personal?.totalScore ?? prev.totalScores,
          }));
        }
      }

      if (rankingRes.status === 'fulfilled') {
        setTopRanking(rankingRes.value.rankings || []);
      }
    } catch (err) {
      console.error('Erreur chargement dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const firstName = user?.first_name || 'Joueur';
  const groupName = selectedGroup?.title || 'Groupe';

  // Bloquer l'affichage si aucun groupe n'est sélectionné
  if (!selectedGroupId) {
    return <NoGroupSelected />;
  }

  return (
    <div className="page">
      <div className="page-header slide-up">
        <div className="page-subtitle">Bienvenue 👋</div>
        <h1 className="page-title">{firstName}</h1>
        {selectedGroup && (
          <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginTop: 4 }}>
            📍 {groupName}
          </div>
        )}
      </div>

      <div className="stats-grid slide-up-delay-1">
        <StatCard value={stats.totalScores} label={`Points dans ${groupName}`} />
        <StatCard value={stats.totalActivities} label="Activités" />
        <StatCard value={stats.rank} label={`Rang dans ${groupName}`} />
      </div>

      {/* Quick actions */}
      <div className="slide-up-delay-1" style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate('/add-score')}>
          🎯 Ajouter un score
        </button>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/help')}>
          ❓ Aide
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="slide-up-delay-2">
            <div className="section-header">
              <h2 className="section-title">🔥 Scores récents</h2>
            </div>
            {recentScores.length > 0 ? (
              recentScores.map((score, i) => (
                <ListItem
                  key={score._id || i}
                  icon="🎯"
                  title={score.activity?.name || 'Activité'}
                  subtitle={new Date(score.createdAt).toLocaleDateString('fr-FR')}
                  value={score.value}
                />
              ))
            ) : (
              <EmptyState icon="📋" text="Aucun score pour le moment." />
            )}
          </div>

          <div className="slide-up-delay-3">
            <div className="section-header">
              <h2 className="section-title">🏆 Top 3</h2>
            </div>
            {topRanking.length > 0 ? (
              topRanking.map((item, i) => (
                <div className="list-item" key={item.userId || i}>
                  <div className={`rank-badge rank-${i + 1}`}>
                    {['🥇', '🥈', '🥉'][i]}
                  </div>
                  <div className="list-item-content">
                    <div className="list-item-title">{item.username || item.firstName}</div>
                    <div className="list-item-subtitle">{item.scoreCount} scores</div>
                  </div>
                  <div className="list-item-value">{item.totalScore}</div>
                </div>
              ))
            ) : (
              <EmptyState icon="🥇" text="Pas encore de classement." />
            )}
          </div>
        </>
      )}
    </div>
  );
}
