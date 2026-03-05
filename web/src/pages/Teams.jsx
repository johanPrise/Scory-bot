import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';
import { LoadingSpinner, EmptyState, ListItem, NoGroupSelected } from '../components';
import { useToast } from '../components/Toast';
import { useGroup } from '../components/GroupContext';

export default function Teams() {
  const navigate = useNavigate();
  const toast = useToast();
  const { selectedGroupId, selectedGroup } = useGroup();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [createName, setCreateName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selectedGroupId) {
      loadTeams();
    }
  }, [selectedGroupId]);

  const loadTeams = async () => {
    try {
      const data = await api.getTeams();
      setTeams(data.teams || []);
    } catch (err) {
      console.error('Erreur chargement équipes:', err);
    } finally {
      setLoading(false);
    }
  };

  const haptic = (type = 'medium') => {
    globalThis.Telegram?.WebApp?.HapticFeedback?.impactOccurred(type);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createName.trim()) return;

    setSubmitting(true);
    try {
      await api.createTeam({ name: createName.trim() });
      globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      toast.success('Équipe créée avec succès !');
      setShowCreate(false);
      setCreateName('');
      loadTeams();
    } catch (err) {
      globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setSubmitting(true);
    try {
      await api.joinTeam(joinCode.trim().toUpperCase());
      globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      toast.success('Équipe rejointe avec succès !');
      setShowJoin(false);
      setJoinCode('');
      loadTeams();
    } catch (err) {
      globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const teamEmojis = ['🏆', '🚀', '💪', '⚡', '🔥', '🌟', '💎', '🎯'];
  const groupName = selectedGroup?.title || 'Groupe';

  // Bloquer l'affichage si aucun groupe n'est sélectionné
  if (!selectedGroupId) {
    return <NoGroupSelected />;
  }

  return (
    <div className="page">
      <div className="page-header slide-up">
        <h1 className="page-title">Équipes</h1>
        <div className="page-subtitle">Vos équipes et communautés</div>
      </div>

      {/* Formulaire création */}
      {showCreate && (
        <form onSubmit={handleCreate} className="card card-glow slide-up" style={{ marginBottom: 12 }}>
          <label htmlFor="teamName" style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', display: 'block', marginBottom: 6 }}>
            Nom de l'équipe
          </label>
          <input
            id="teamName"
            type="text"
            value={createName}
            onChange={e => setCreateName(e.target.value)}
            placeholder="Ex: Les Champions"
            required
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8, marginBottom: 12,
              border: '1px solid var(--scory-card-border)', background: 'var(--tg-theme-bg-color)',
              color: 'var(--tg-theme-text-color)', fontSize: 15, fontFamily: 'inherit', outline: 'none'
            }}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
              {submitting ? '⏳' : '✅'} Créer
            </button>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowCreate(false)}>
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Formulaire rejoindre */}
      {showJoin && (
        <form onSubmit={handleJoin} className="card card-glow slide-up" style={{ marginBottom: 12 }}>
          <label htmlFor="joinCode" style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', display: 'block', marginBottom: 6 }}>
            Code d'invitation
          </label>
          <input
            id="joinCode"
            type="text"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value)}
            placeholder="Ex: ABC123"
            required
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8, marginBottom: 12,
              border: '1px solid var(--scory-card-border)', background: 'var(--tg-theme-bg-color)',
              color: 'var(--tg-theme-text-color)', fontSize: 15, fontFamily: 'inherit',
              outline: 'none', textTransform: 'uppercase', letterSpacing: 2
            }}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submitting}>
              {submitting ? '⏳' : '🔗'} Rejoindre
            </button>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowJoin(false)}>
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Liste des équipes */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="slide-up-delay-1">
          {teams.length > 0 ? (
            teams.map((team, i) => (
              <ListItem
                key={team._id || i}
                icon={teamEmojis[i % teamEmojis.length]}
                title={team.name}
                subtitle={`${team.members?.length || 0} membres · ${team.totalScore || 0} pts dans ${groupName}`}
                onClick={() => navigate(`/teams/${team._id}`)}
                trailing={<div style={{ color: 'var(--tg-theme-hint-color)', fontSize: 20 }}>›</div>}
              />
            ))
          ) : (
            <EmptyState icon="👥" text="Aucune équipe. Créez-en une ou rejoignez-en une !" />
          )}
        </div>
      )}

      {/* Boutons action */}
      {!showCreate && !showJoin && (
        <div className="slide-up-delay-2" style={{ marginTop: 24, display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { haptic(); setShowCreate(true); }}>
            ➕ Créer
          </button>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { haptic('light'); setShowJoin(true); }}>
            🔗 Rejoindre
          </button>
        </div>
      )}
    </div>
  );
}
