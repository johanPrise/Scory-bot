import { useState, useEffect } from 'react';
import * as api from '../api';
import { LoadingSpinner, EmptyState } from '../components';
import { useGroup } from '../components/GroupContext';

export default function Rankings() {
  const { selectedGroupId } = useGroup();
  const [scope, setScope] = useState('individual');
  const [period, setPeriod] = useState('month');
  const [activityId, setActivityId] = useState('');
  const [activities, setActivities] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getActivities().then(data => setActivities(data.activities || data || [])).catch(() => {});
  }, [selectedGroupId]);

  useEffect(() => {
    loadRankings();
  }, [scope, period, activityId, selectedGroupId]);

  const loadRankings = async () => {
    setLoading(true);
    try {
      const params = { scope, period, limit: 20 };
      if (activityId) params.activityId = activityId;
      const data = await api.getRankings(params);
      setRankings(data.rankings || []);
    } catch (err) {
      console.error('Erreur chargement classement:', err);
      setRankings([]);
    } finally {
      setLoading(false);
    }
  };

  const getRankClass = (rank) => rank <= 3 ? `rank-${rank}` : 'rank-default';
  const getMedal = (rank) => ['🥇', '🥈', '🥉'][rank - 1] || rank;

  return (
    <div className="page">
      <div className="page-header slide-up">
        <h1 className="page-title">Classement</h1>
        <div className="page-subtitle">Qui est en tête ?</div>
      </div>

      <div className="chips-row slide-up-delay-1">
        <button className={`chip ${scope === 'individual' ? 'active' : ''}`} onClick={() => setScope('individual')}>
          👤 Individuel
        </button>
        <button className={`chip ${scope === 'team' ? 'active' : ''}`} onClick={() => setScope('team')}>
          👥 Équipes
        </button>
      </div>

      <div className="chips-row slide-up-delay-1">
        {['day', 'week', 'month', 'year', 'all'].map(p => (
          <button
            key={p}
            className={`chip ${period === p ? 'active' : ''}`}
            onClick={() => setPeriod(p)}
          >
            {{ day: 'Jour', week: 'Semaine', month: 'Mois', year: 'Année', all: 'Tout' }[p]}
          </button>
        ))}
      </div>

      {activities.length > 0 && (
        <div className="slide-up-delay-1" style={{ marginBottom: 12 }}>
          <select
            value={activityId}
            onChange={e => setActivityId(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10,
              border: '1px solid var(--scory-card-border)', background: 'var(--scory-card-bg)',
              color: 'var(--tg-theme-text-color)', fontSize: 14, fontFamily: 'inherit',
              outline: 'none', appearance: 'none', WebkitAppearance: 'none',
              backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23888\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center'
            }}
          >
            <option value="">🎯 Toutes les activités</option>
            {activities.map(a => (
              <option key={a._id} value={a._id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}

      {(() => {
        if (loading) return <LoadingSpinner />;
        if (rankings.length === 0) return <EmptyState icon="🏆" text="Pas encore de classement pour cette période." />;
        return (
          <div className="slide-up-delay-2">
            {rankings.map((item, i) => {
              const rank = i + 1;
              const name = scope === 'team' ? item.name : (item.username || `${item.firstName || ''} ${item.lastName || ''}`.trim());
              const initial = (name || '?')[0].toUpperCase();

              return (
                <div className="list-item" key={item.userId || item.teamId || i}>
                  <div className={`rank-badge ${getRankClass(rank)}`}>{getMedal(rank)}</div>
                  <div className="avatar" style={{ width: 40, height: 40, fontSize: 16 }}>{initial}</div>
                  <div className="list-item-content">
                    <div className="list-item-title">{name}</div>
                    <div className="list-item-subtitle">
                      {item.scoreCount} score{item.scoreCount > 1 ? 's' : ''} · Moy. {item.averageScore || 0}
                    </div>
                  </div>
                  <div className="list-item-value">{item.totalScore}</div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
