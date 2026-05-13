import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import * as api from '../api';
import { BackButton, EmptyState, LoadingSpinner, NoGroupSelected } from '../components';
import { useGroup } from '../components/GroupContext';
import { useToast } from '../components/Toast';

function notify(type) {
  globalThis.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
}

function formatDate(value) {
  if (!value) return 'Date inconnue';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date inconnue'
    : date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

function getScoreOwner(score) {
  if (score.team?.name) return score.team.name;
  return score.user?.username || score.user?.firstName || 'Utilisateur';
}

function getScoreContext(score) {
  const parts = [score.activity?.name || 'Activité'];
  if (score.subActivity) parts.push(score.subActivity);
  if (score.team?.name && score.user) parts.push(`via ${score.user.username || score.user.firstName || 'membre'}`);
  return parts.join(' · ');
}

function getApprovalStats(scores) {
  const totalPoints = scores.reduce((sum, score) => sum + (Number(score.value) || 0), 0);
  const teamScores = scores.filter(score => score.team).length;

  return {
    total: scores.length,
    points: totalPoints,
    teams: teamScores,
  };
}

function ApprovalHero({ stats }) {
  return (
    <section className="approval-hero slide-up">
      <div>
        <BackButton fallback="/" />
        <div className="dashboard-eyebrow">Admin</div>
        <h1 className="approval-title">Approbation</h1>
        <p className="approval-subtitle">File de validation des scores du groupe.</p>
      </div>
      <div className="approval-hero-meter" aria-label={`${stats.total} scores en attente`}>
        <span>En attente</span>
        <strong>{stats.total}</strong>
      </div>
    </section>
  );
}

ApprovalHero.propTypes = {
  stats: PropTypes.shape({
    total: PropTypes.number.isRequired,
  }).isRequired,
};

function ApprovalMetrics({ stats }) {
  return (
    <section className="metric-strip slide-up-delay-1" aria-label="Résumé des scores à approuver">
      <div className="metric-tile metric-tile-score">
        <div className="metric-value">{stats.total}</div>
        <div className="metric-label">Scores</div>
      </div>
      <div className="metric-tile">
        <div className="metric-value">{stats.points}</div>
        <div className="metric-label">Points</div>
      </div>
      <div className="metric-tile metric-tile-leader">
        <div className="metric-value">{stats.teams}</div>
        <div className="metric-label">Équipes</div>
      </div>
    </section>
  );
}

ApprovalMetrics.propTypes = {
  stats: PropTypes.shape({
    total: PropTypes.number.isRequired,
    points: PropTypes.number.isRequired,
    teams: PropTypes.number.isRequired,
  }).isRequired,
};

function RejectPanel({ score, reason, busy, onReasonChange, onConfirm, onCancel }) {
  if (!score) return null;

  return (
    <section className="approval-reject-panel slide-up">
      <div className="approval-reject-header">
        <div>
          <div className="dashboard-eyebrow">Rejet</div>
          <h2>{getScoreOwner(score)}</h2>
        </div>
        <button type="button" className="icon-button" onClick={onCancel} aria-label="Fermer le rejet">
          ×
        </button>
      </div>
      <label className="form-group" htmlFor="rejectReason">
        <span className="form-label">Raison du rejet</span>
        <textarea
          id="rejectReason"
          className="form-textarea"
          value={reason}
          onChange={event => onReasonChange(event.target.value)}
          placeholder="Explique pourquoi ce score est rejeté."
          rows={3}
        />
      </label>
      <div className="form-actions">
        <button type="button" className="btn btn-primary approval-danger-primary" onClick={onConfirm} disabled={busy}>
          {busy ? 'Rejet...' : 'Rejeter'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </section>
  );
}

RejectPanel.propTypes = {
  score: PropTypes.object,
  reason: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  onReasonChange: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

function PendingScoreCard({ score, busy, onApprove, onReject }) {
  return (
    <article className="approval-score-card">
      <div className="approval-score-main">
        <div className="approval-score-icon">✓</div>
        <div className="approval-score-body">
          <h2>{getScoreOwner(score)}</h2>
          <p>{getScoreContext(score)}</p>
        </div>
        <div className="approval-score-value">
          <strong>{score.value}</strong>
          <span>/{score.maxPossible || 100}</span>
        </div>
      </div>

      {score.metadata?.comments && (
        <blockquote className="approval-score-comment">{score.metadata.comments}</blockquote>
      )}

      <div className="approval-score-meta">
        <span>{formatDate(score.createdAt)}</span>
        <span>{score.context === 'team' || score.team ? 'Score équipe' : 'Score joueur'}</span>
      </div>

      <div className="approval-score-actions">
        <button type="button" className="btn btn-primary" onClick={() => onApprove(score._id)} disabled={busy}>
          {busy ? '...' : 'Approuver'}
        </button>
        <button type="button" className="btn btn-secondary approval-reject-button" onClick={() => onReject(score)} disabled={busy}>
          Rejeter
        </button>
      </div>
    </article>
  );
}

PendingScoreCard.propTypes = {
  score: PropTypes.object.isRequired,
  busy: PropTypes.bool.isRequired,
  onApprove: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired,
};

function PendingList({ scores, actionId, onApprove, onReject }) {
  if (scores.length === 0) {
    return <EmptyState icon="✅" text="Aucun score en attente d'approbation." />;
  }

  return (
    <section className="approval-list slide-up-delay-2" aria-label="Scores en attente">
      {scores.map(score => (
        <PendingScoreCard
          key={score._id}
          score={score}
          busy={actionId === score._id}
          onApprove={onApprove}
          onReject={onReject}
        />
      ))}
    </section>
  );
}

PendingList.propTypes = {
  scores: PropTypes.array.isRequired,
  actionId: PropTypes.string,
  onApprove: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired,
};

export default function ScoreApproval() {
  const toast = useToast();
  const { selectedGroupId } = useGroup();
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [rejectScore, setRejectScore] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const stats = useMemo(() => getApprovalStats(scores), [scores]);

  const loadPending = useCallback(async () => {
    setLoading(true);

    try {
      const data = await api.getPendingScores({ limit: 50 });
      setScores(data.scores || []);
    } catch (error) {
      if (error.message?.includes('403')) {
        toast.error('Accès réservé aux administrateurs.');
      } else {
        toast.error('Erreur de chargement.');
      }
      setScores([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!selectedGroupId) return;
    loadPending();
  }, [loadPending, selectedGroupId]);

  const handleApprove = useCallback(async id => {
    setActionId(id);

    try {
      await api.approveScore(id);
      notify('success');
      toast.success('Score approuvé.');
      setScores(prev => prev.filter(score => score._id !== id));
    } catch (error) {
      notify('error');
      toast.error(error.message || 'Erreur.');
    } finally {
      setActionId(null);
    }
  }, [toast]);

  const openRejectPanel = useCallback(score => {
    setRejectScore(score);
    setRejectReason('');
  }, []);

  const closeRejectPanel = useCallback(() => {
    setRejectScore(null);
    setRejectReason('');
  }, []);

  const handleReject = useCallback(async () => {
    if (!rejectScore) return;
    if (!rejectReason.trim()) {
      toast.warning('Veuillez indiquer une raison.');
      return;
    }

    setActionId(rejectScore._id);

    try {
      await api.rejectScore(rejectScore._id, { reason: rejectReason.trim() });
      notify('success');
      toast.success('Score rejeté.');
      setScores(prev => prev.filter(score => score._id !== rejectScore._id));
      closeRejectPanel();
    } catch (error) {
      notify('error');
      toast.error(error.message || 'Erreur.');
    } finally {
      setActionId(null);
    }
  }, [closeRejectPanel, rejectReason, rejectScore, toast]);

  if (!selectedGroupId) return <NoGroupSelected />;

  return (
    <div className="page approval-page">
      <ApprovalHero stats={stats} />
      <ApprovalMetrics stats={stats} />

      <RejectPanel
        score={rejectScore}
        reason={rejectReason}
        busy={Boolean(rejectScore && actionId === rejectScore._id)}
        onReasonChange={setRejectReason}
        onConfirm={handleReject}
        onCancel={closeRejectPanel}
      />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <PendingList
          scores={scores}
          actionId={actionId}
          onApprove={handleApprove}
          onReject={openRejectPanel}
        />
      )}
    </div>
  );
}
