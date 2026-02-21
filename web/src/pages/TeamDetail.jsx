import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from '../api';

export default function TeamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members');

  useEffect(() => {
    if (id) loadTeam();
  }, [id]);

  const loadTeam = async () => {
    try {
      const [teamRes, membersRes, statsRes] = await Promise.allSettled([
        api.getTeam(id),
        api.getTeamMembers(id),
        api.getTeamStats(id)
      ]);

      if (teamRes.status === 'fulfilled') {
        setTeam(teamRes.value.team || teamRes.value);
      }
      if (membersRes.status === 'fulfilled') {
        setMembers(membersRes.value.members || []);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.stats || statsRes.value);
      }
    } catch (err) {
      console.error('Erreur chargement équipe:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading"><div className="spinner" /></div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">❌</div>
          <div className="empty-state-text">Équipe introuvable</div>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/teams')}>
          ← Retour aux équipes
        </button>
      </div>
    );
  }

  const memberCount = team.members?.length || members.length || 0;
  const totalScore = stats?.totalScore || team.stats?.totalScore || 0;
  const joinCode = team.settings?.joinCode || '';

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header slide-up">
        <button
          onClick={() => navigate('/teams')}
          style={{ background: 'none', border: 'none', color: 'var(--tg-theme-link-color)', cursor: 'pointer', fontSize: 14, padding: '4px 0', marginBottom: 8 }}
        >
          ← Retour
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="avatar" style={{ fontSize: 28 }}>
            {(team.name || '?')[0].toUpperCase()}
          </div>
          <div>
            <h1 className="page-title">{team.name}</h1>
            <div className="page-subtitle">{team.description || 'Pas de description'}</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid slide-up-delay-1">
        <div className="stat-card">
          <div className="stat-value">{memberCount}</div>
          <div className="stat-label">Membres</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalScore}</div>
          <div className="stat-label">Score total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.activitiesCount || 0}</div>
          <div className="stat-label">Activités</div>
        </div>
      </div>

      {/* Code d'invitation */}
      {joinCode && (
        <div className="card card-glow slide-up-delay-1" style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 6 }}>Code d'invitation</div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 4, fontFamily: 'monospace', color: 'var(--tg-theme-accent-text-color)' }}>
            {joinCode}
          </div>
          <button
            className="btn btn-secondary"
            style={{ marginTop: 10, padding: '8px 16px', fontSize: 13 }}
            onClick={() => {
              navigator.clipboard?.writeText(joinCode);
              globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
            }}
          >
            📋 Copier le code
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="chips-row slide-up-delay-1">
        <button className={`chip ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
          👥 Membres ({memberCount})
        </button>
        <button className={`chip ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>
          📋 Info
        </button>
      </div>

      {/* Tab content */}
      <div className="slide-up-delay-2">
        {activeTab === 'members' && (
          <div>
            {members.length > 0 ? (
              members.map((member, i) => {
                const user = member.userId || member;
                const name = user.username || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Membre';
                const initial = (name[0] || '?').toUpperCase();

                return (
                  <div className="list-item" key={user._id || i}>
                    <div className="avatar" style={{ width: 40, height: 40, fontSize: 16 }}>{initial}</div>
                    <div className="list-item-content">
                      <div className="list-item-title">
                        {name}
                        {member.isAdmin && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--tg-theme-accent-text-color)' }}>👑 Admin</span>}
                      </div>
                      <div className="list-item-subtitle">
                        Rejoint le {new Date(member.joinedAt).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                    <div className="list-item-value" style={{ fontSize: 13 }}>
                      {user.stats?.totalScore || 0} pts
                    </div>
                  </div>
                );
              })
            ) : (team.members || []).length > 0 ? (
              // Fallback si les membres populés ne sont pas disponibles
              (team.members || []).map((member, i) => (
                <div className="list-item" key={i}>
                  <div className="avatar" style={{ width: 40, height: 40, fontSize: 16 }}>
                    {(member.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="list-item-content">
                    <div className="list-item-title">
                      {member.username || 'Membre'}
                      {member.isAdmin && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--tg-theme-accent-text-color)' }}>👑 Admin</span>}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">👥</div>
                <div className="empty-state-text">Aucun membre</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'info' && (
          <div className="card">
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 4 }}>Nom</div>
              <div style={{ fontWeight: 600 }}>{team.name}</div>
            </div>
            {team.description && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 4 }}>Description</div>
                <div style={{ fontWeight: 600 }}>{team.description}</div>
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 4 }}>Créée le</div>
              <div style={{ fontWeight: 600 }}>{new Date(team.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 4 }}>Capacité</div>
              <div style={{ fontWeight: 600 }}>{memberCount}/{team.settings?.maxMembers || 10} membres</div>
            </div>
            {team.createdBy && (
              <div>
                <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 4 }}>Créée par</div>
                <div style={{ fontWeight: 600 }}>{team.createdBy.username || team.createdBy.firstName || '—'}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
