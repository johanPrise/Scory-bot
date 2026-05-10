import PropTypes from 'prop-types';
import { ListItem, EmptyState } from '../index';
import SubActivityForm from './SubActivityForm';

export default function SubActivitiesTab({
  subActivities, showSubForm, subForm, submittingSub,
  updateSubForm, openSubForm, closeSubForm,
  handleAddSubActivity, handleDeleteSubActivity,
}) {
  return (
    <div>
      {showSubForm ? (
        <SubActivityForm
          subForm={subForm}
          submittingSub={submittingSub}
          updateSubForm={updateSubForm}
          onSubmit={handleAddSubActivity}
          onCancel={closeSubForm}
        />
      ) : (
        <button className="btn btn-secondary" style={{ marginBottom: 12 }} onClick={openSubForm}>
          ➕ Ajouter une sous-activité
        </button>
      )}
      {subActivities.length > 0 ? (
        subActivities.map((sub) => (
          <ListItem
            key={sub._id || `sub-${sub.name}`}
            icon="📎"
            title={sub.name}
            subtitle={sub.description || 'Pas de description'}
            value={`/${sub.maxScore || 100}`}
            trailing={
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteSubActivity(sub._id, sub.name); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4, opacity: 0.6 }}
                title="Supprimer"
              >
                🗑
              </button>
            }
          />
        ))
      ) : (
        <EmptyState icon="📦" text="Aucune sous-activité" />
      )}
    </div>
  );
}

SubActivitiesTab.propTypes = {
  subActivities: PropTypes.array.isRequired,
  showSubForm: PropTypes.bool,
  subForm: PropTypes.object,
  submittingSub: PropTypes.bool,
  updateSubForm: PropTypes.func,
  openSubForm: PropTypes.func,
  closeSubForm: PropTypes.func,
  handleAddSubActivity: PropTypes.func,
  handleDeleteSubActivity: PropTypes.func,
};
