import PropTypes from 'prop-types';
import { TYPE_EMOJIS } from '../../constants/activityTypes';

function InfoRow({ label, value }) {
  return (
    <div className="activity-info-row">
      <div>{label}</div>
      <strong>{value}</strong>
    </div>
  );
}

InfoRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node,
};

InfoTab.propTypes = {
  activity: PropTypes.object.isRequired,
};

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date inconnue'
    : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function InfoTab({ activity }) {
  return (
    <div className="activity-info-panel">
      <InfoRow label="Type" value={`${TYPE_EMOJIS[activity.type] || '📌'} ${activity.type || 'Autre'}`} />
      <InfoRow label="Statut" value={activity.settings?.isActive ? '🟢 Active' : '🔴 Inactive'} />
      <InfoRow
        label="Créée le"
        value={formatDate(activity.createdAt)}
      />
      {activity.createdBy && (
        <InfoRow
          label="Créée par"
          value={activity.createdBy.username || activity.createdBy.firstName || '—'}
        />
      )}
    </div>
  );
}
