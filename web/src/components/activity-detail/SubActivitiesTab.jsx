import PropTypes from 'prop-types';
import { EmptyState } from '../index';
import SubActivityForm from './SubActivityForm';

export default function SubActivitiesTab({
  subActivities, showSubForm, subForm, submittingSub,
  updateSubForm, openSubForm, closeSubForm,
  handleAddSubActivity, handleDeleteSubActivity,
}) {
  return (
    <div className="subactivities-panel">
      {showSubForm ? (
        <SubActivityForm
          subForm={subForm}
          submittingSub={submittingSub}
          updateSubForm={updateSubForm}
          onSubmit={handleAddSubActivity}
          onCancel={closeSubForm}
        />
      ) : (
        <button className="btn btn-secondary subactivity-add-button" onClick={openSubForm}>
          Ajouter une sous-activité
        </button>
      )}
      {subActivities.length > 0 ? (
        subActivities.map((sub) => (
          <article className="subactivity-card" key={sub._id || `sub-${sub.name}`}>
            <div className="subactivity-icon">⌁</div>
            <div className="subactivity-body">
              <h3>{sub.name}</h3>
              <p>{sub.description || 'Pas de description'}</p>
              <span>Score max {sub.maxScore || 100}</span>
            </div>
            <div className="subactivity-actions">
              <button
                type="button"
                className="score-delete-button"
                onClick={() => handleDeleteSubActivity(sub._id || sub.name, sub.name)}
                title="Supprimer"
                aria-label={`Supprimer ${sub.name}`}
              >
                🗑
              </button>
            </div>
          </article>
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
