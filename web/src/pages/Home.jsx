import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import * as api from '../api';
import { LoadingSpinner, EmptyState, ListItem, NoGroupSelected } from '../components';
import { useGroup } from '../components/GroupContext';

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date inconnue' : date.toLocaleDateString('fr-FR');
}

const INITIAL_STATS = { totalScores: 0, totalActivities: 0, rank: '—' };

const scoreShape = PropTypes.shape({
  _id: PropTypes.string,
  activity: PropTypes.shape({
    name: PropTypes.string,
  }),
  createdAt: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
});

const rankingItemShape = PropTypes.shape({
  userId: PropTypes.string,
  username: PropTypes.string,
  firstName: PropTypes.string,
  name: PropTypes.string,
  totalScore: PropTypes.number,
  scoreCount: PropTypes.number,
});

function getDisplayName(item = {}) {
  return item.username || item.firstName || item.name || 'Participant';
}

function fetchDashboardData() {
  return Promise.allSettled([
    api.getPersonalScores({ limit: 5 }),
    api.getRankings({ scope: 'individual', limit: 3 }),
    api.getDashboard({ period: 'month' })
  ]);
}

function applyPersonalResult(current, result) {
  if (result.status === 'fulfilled') {
    const data = result.value;

    return {
      ...current,
      recentScores: data.scores || [],
      stats: {
        ...current.stats,
        totalScores: data.personalStats?.totalPoints || 0,
        totalActivities: data.personalStats?.totalScores || 0
      },
    };
  }

  return current;
}

function applyDashboardResult(current, result) {
  if (result.status === 'fulfilled') {
    const dashData = result.value;
    const personal = dashData.stats?.personal;
    const ranking = personal?.ranking;
    const rankStats = ranking?.position
      ? {
        rank: `#${ranking.position}`,
        totalScores: personal?.totalScore ?? current.stats.totalScores,
        totalActivities: personal?.scores ?? current.stats.totalActivities,
      }
      : {};

    return {
      ...current,
      recentScores: dashData.recentScores || current.recentScores,
      stats: { ...current.stats, ...rankStats },
    };
  }

  return current;
}

function applyRankingResult(current, result) {
  if (result.status === 'fulfilled') {
    return { ...current, topRanking: result.value.rankings || [] };
  }

  return current;
}

function getLoadedDashboard(current, results) {
  const [personalResult, rankingResult, dashboardResult] = results;
  const withPersonal = applyPersonalResult(current, personalResult);
  const withDashboard = applyDashboardResult(withPersonal, dashboardResult);

  return applyRankingResult(withDashboard, rankingResult);
}

function createDashboardState(groupId = '') {
  return {
    groupId,
    stats: INITIAL_STATS,
    recentScores: [],
    topRanking: [],
  };
}

function MetricTile({ value, label, tone = 'default' }) {
  return (
    <div className={`metric-tile metric-tile-${tone}`}>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
}

MetricTile.propTypes = {
  value: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  tone: PropTypes.string,
};

function DashboardHero({ firstName, groupName, rank }) {
  return (
    <section className="dashboard-hero slide-up">
      <div>
        <div className="dashboard-eyebrow">Groupe actif</div>
        <h1 className="dashboard-title">{groupName}</h1>
        <p className="dashboard-subtitle">Salut {firstName}, ton cockpit de score est prêt.</p>
      </div>
      <div className="dashboard-rank-card" aria-label={`Votre rang est ${rank}`}>
        <span className="dashboard-rank-label">Rang</span>
        <strong>{rank}</strong>
      </div>
    </section>
  );
}

DashboardHero.propTypes = {
  firstName: PropTypes.string.isRequired,
  groupName: PropTypes.string.isRequired,
  rank: PropTypes.string.isRequired,
};

function QuickActions({ onNavigate }) {
  return (
    <section className="dashboard-actions slide-up-delay-1" aria-label="Actions rapides">
      <button type="button" className="score-action-card primary" onClick={() => onNavigate('/add-score')}>
        <span className="score-action-kicker">Saisir</span>
        <span className="score-action-title">Ajouter un score</span>
      </button>
      <button type="button" className="score-action-card" onClick={() => onNavigate('/rankings')}>
        <span className="score-action-kicker">Voir</span>
        <span className="score-action-title">Scoreboard</span>
      </button>
    </section>
  );
}

QuickActions.propTypes = {
  onNavigate: PropTypes.func.isRequired,
};

function DashboardMetrics({ stats, topRanking }) {
  const topLeader = topRanking[0];
  const leaderName = topLeader ? getDisplayName(topLeader) : '—';

  return (
    <div className="metric-strip slide-up-delay-1">
      <MetricTile value={stats.totalScores} label="Points" tone="score" />
      <MetricTile value={stats.totalActivities} label="Scores validés" />
      <MetricTile value={leaderName} label="Leader" tone="leader" />
    </div>
  );
}

DashboardMetrics.propTypes = {
  stats: PropTypes.shape({
    totalScores: PropTypes.number.isRequired,
    totalActivities: PropTypes.number.isRequired,
  }).isRequired,
  topRanking: PropTypes.arrayOf(rankingItemShape).isRequired,
};

function RecentScoresSection({ scores }) {
  return (
    <div className="slide-up-delay-2">
      <div className="section-header">
        <h2 className="section-title">Fil d’activité</h2>
      </div>
      {scores.length > 0 ? (
        scores.map((score, i) => (
          <ListItem
            key={score._id || i}
            icon="🎯"
            title={score.activity?.name || 'Activité'}
            subtitle={formatDate(score.createdAt)}
            value={score.value}
          />
        ))
      ) : (
        <EmptyState icon="📋" text="Aucun score pour le moment." />
      )}
    </div>
  );
}

RecentScoresSection.propTypes = {
  scores: PropTypes.arrayOf(scoreShape).isRequired,
};

function TopRankingSection({ rankings, onNavigate }) {
  return (
    <div className="slide-up-delay-3">
      <div className="section-header">
        <h2 className="section-title">Podium du groupe</h2>
        <button type="button" className="section-action" onClick={() => onNavigate('/rankings')}>
          Tout voir
        </button>
      </div>
      {rankings.length > 0 ? (
        rankings.map((item, i) => (
          <div className="leaderboard-row" key={item.userId || i}>
            <div className={`rank-badge rank-${i + 1}`}>
              {i + 1}
            </div>
            <div className="list-item-content">
              <div className="list-item-title">{getDisplayName(item)}</div>
              <div className="list-item-subtitle">{item.scoreCount} scores</div>
            </div>
            <div className="list-item-value">{item.totalScore}</div>
          </div>
        ))
      ) : (
        <EmptyState icon="🏆" text="Pas encore de classement." />
      )}
    </div>
  );
}

TopRankingSection.propTypes = {
  rankings: PropTypes.arrayOf(rankingItemShape).isRequired,
  onNavigate: PropTypes.func.isRequired,
};

function DashboardBody({ loading, recentScores, topRanking, onNavigate }) {
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <RecentScoresSection scores={recentScores} />
      <TopRankingSection rankings={topRanking} onNavigate={onNavigate} />
    </>
  );
}

DashboardBody.propTypes = {
  loading: PropTypes.bool.isRequired,
  recentScores: PropTypes.arrayOf(scoreShape).isRequired,
  topRanking: PropTypes.arrayOf(rankingItemShape).isRequired,
  onNavigate: PropTypes.func.isRequired,
};

function useDashboardData(selectedGroupId) {
  const [dashboard, setDashboard] = useState(() => createDashboardState());

  useEffect(() => {
    if (selectedGroupId) {
      let ignoreResult = false;

      fetchDashboardData()
        .then(results => {
          if (ignoreResult) return;

          setDashboard(current => {
            const baseState = current.groupId === selectedGroupId
              ? current
              : createDashboardState(selectedGroupId);

            return {
              ...getLoadedDashboard(baseState, results),
              groupId: selectedGroupId,
            };
          });
        })
        .catch(err => {
          if (ignoreResult) return;

          console.error('Erreur chargement dashboard:', err);
          setDashboard(createDashboardState(selectedGroupId));
        });

      return () => {
        ignoreResult = true;
      };
    }
  }, [selectedGroupId]);

  const loading = Boolean(selectedGroupId) && dashboard.groupId !== selectedGroupId;
  const visibleDashboard = loading ? createDashboardState(selectedGroupId) : dashboard;

  return { ...visibleDashboard, loading };
}

export default function Home() {
  const navigate = useNavigate();
  const { selectedGroupId, selectedGroup } = useGroup();
  const user = globalThis.Telegram?.WebApp?.initDataUnsafe?.user || null;
  const { stats, recentScores, topRanking, loading } = useDashboardData(selectedGroupId);

  const firstName = user?.first_name || 'Joueur';
  const groupName = selectedGroup?.title || 'Groupe';

  // Bloquer l'affichage si aucun groupe n'est sélectionné
  if (!selectedGroupId) {
    return <NoGroupSelected />;
  }

  return (
    <div className="page dashboard-page">
      <DashboardHero firstName={firstName} groupName={groupName} rank={stats.rank} />

      <DashboardMetrics stats={stats} topRanking={topRanking} />
      <QuickActions onNavigate={navigate} />
      <DashboardBody
        loading={loading}
        recentScores={recentScores}
        topRanking={topRanking}
        onNavigate={navigate}
      />
    </div>
  );
}
