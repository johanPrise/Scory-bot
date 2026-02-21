import { useState, useEffect } from 'react';
import * as api from '../api';
import { BackButton, LoadingSpinner, EmptyState } from '../components';
import { useToast } from '../components/Toast';

export default function ScoreApproval() {
  const toast = useToast();
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null); // score id being acted on
  const [rejectModal, setRejectModal] = useState(null); // score id for rejection
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    try {
      const data = await api.getPendingScores({ limit: 50 });
      setScores(data.scores || []);
    } catch (err) {
      if (err.message?.includes('403')) {
        toast.error('Accès réservé aux administrateurs');
      } else {
        toast.error('Erreur de chargement');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setActionId(id);
    try {
      await api.approveScore(id);
      globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      toast.success('Score approuvé');
      setScores(prev => prev.filter(s => s._id !== id));
    } catch (err) {
      toast.error(err.message || 'Erreur');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.warning('Veuillez indiquer une raison');
      return;
    }
    setActionId(rejectModal);
    try {
      await api.rejectScore(rejectModal, { reason: rejectReason });
      globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      toast.success('Score rejeté');
      setScores(prev => prev.filter(s => s._id !== rejectModal));
      setRejectModal(null);
      setRejectReason('');
    } catch (err) {
      toast.error(err.message || 'Erreur');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="page">
      <div className="page-header slide-up">
        <BackButton fallback="/" />
        <h1 className="page-title">Approbation</h1>
        <div className="page-subtitle">{scores.length} score{scores.length !== 1 ? 's' : ''} en attente</div>
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="card card-glow slide-up" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Raison du rejet</div>
          <textarea
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Expliquez pourquoi ce score est rejeté..."
            rows={3}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8, resize: 'none',
              border: '1px solid var(--scory-card-border)',
              background: 'var(--tg-theme-bg-color)',
              color: 'var(--tg-theme-text-color)',
              fontSize: 14, fontFamily: 'inherit', outline: 'none',
              marginBottom: 12,
            }}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1, background: 'var(--tg-theme-destructive-text-color)' }}
              onClick={handleReject}
              disabled={actionId === rejectModal}
            >
              {actionId === rejectModal ? '⏳' : '❌'} Rejeter
            </button>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setRejectModal(null); setRejectReason(''); }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : scores.length === 0 ? (
        <EmptyState icon="✅" text="Aucun score en attente d'approbation" />
      ) : (
        <div className="slide-up-delay-1">
          {scores.map(score => (
            <div className="card" key={score._id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div className="list-item-icon" style={{ fontSize: 24 }}>🎯</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    {score.user?.username || score.user?.firstName || 'Utilisateur'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)' }}>
                    {score.activity?.name || 'Activité'}
                    {score.subActivity && ` · ${score.subActivity}`}
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--tg-theme-accent-text-color)' }}>
                  {score.value}/{score.maxPossible}
                </div>
              </div>

              {score.metadata?.comments && (
                <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 8, fontStyle: 'italic' }}>
                  « {score.metadata.comments} »
                </div>
              )}

              <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', marginBottom: 10 }}>
                {new Date(score.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                {score.team && ` · Équipe: ${score.team.name}`}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px 0', fontSize: 13 }}
                  onClick={() => handleApprove(score._id)}
                  disabled={actionId === score._id}
                >
                  {actionId === score._id ? '⏳' : '✅'} Approuver
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '10px 0', fontSize: 13, color: 'var(--tg-theme-destructive-text-color)' }}
                  onClick={() => setRejectModal(score._id)}
                  disabled={actionId === score._id}
                >
                  ❌ Rejeter
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
