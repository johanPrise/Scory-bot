import PropTypes from 'prop-types';

export default function SubActivityForm({ subForm, submittingSub, updateSubForm, onSubmit, onCancel }) {
  return (
    <form onSubmit={onSubmit} className="subactivity-form">
      <label className="form-group" htmlFor="subName">
        <span className="form-label">Nom *</span>
        <input
          id="subName"
          type="text"
          value={subForm.name}
          onChange={(e) => updateSubForm('name', e.target.value)}
          placeholder="Ex: Épreuve 1"
          required
          className="form-input"
        />
      </label>
      <label className="form-group" htmlFor="subDesc">
        <span className="form-label">Description</span>
        <input
          id="subDesc"
          type="text"
          value={subForm.description}
          onChange={(e) => updateSubForm('description', e.target.value)}
          placeholder="Description optionnelle"
          className="form-input"
        />
      </label>
      <label className="form-group" htmlFor="subMaxScore">
        <span className="form-label">Score max</span>
        <input
          id="subMaxScore"
          type="number"
          value={subForm.maxScore}
          onChange={(e) => updateSubForm('maxScore', Number(e.target.value))}
          min="1"
          className="form-input"
        />
      </label>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submittingSub}>
          {submittingSub ? 'Ajout...' : 'Ajouter'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </form>
  );
}

SubActivityForm.propTypes = {
  subForm: PropTypes.shape({
    name: PropTypes.string,
    description: PropTypes.string,
    maxScore: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  }).isRequired,
  submittingSub: PropTypes.bool,
  updateSubForm: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};
