import PropTypes from 'prop-types';
import { TYPE_EMOJIS } from '../../constants/activityTypes';

function InfoRow({ label, value }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
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

export default function InfoTab({ activity }) {
  return (
    <div className="card">
      <InfoRow label="Type" value={`${TYPE_EMOJIS[activity.type] || '📌'} ${activity.type || 'Autre'}`} />
      <InfoRow label="Statut" value={activity.settings?.isActive ? '🟢 Active' : '🔴 Inactive'} />
      <InfoRow
        label="Créée le"
        value={new Date(activity.createdAt).toLocaleDateString('fr-FR', {
          day: 'numeric', month: 'long', year: 'numeric',
        })}
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
