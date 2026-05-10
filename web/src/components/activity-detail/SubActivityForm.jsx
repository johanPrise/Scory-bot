import PropTypes from 'prop-types';

export default function SubActivityForm({ subForm, submittingSub, updateSubForm, onSubmit, onCancel }) {
  return (
    <form onSubmit={onSubmit} className="card card-glow" style={{ marginBottom: 12 }}>
      <div style={{ marginBottom: 10 }}>
        <label htmlFor="subName" style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', display: 'block', marginBottom: 4 }}>
          Nom *
        </label>
        <input
          id="subName"
          type="text"
          value={subForm.name}
          onChange={(e) => updateSubForm('name', e.target.value)}
          placeholder="Ex: Épreuve 1"
          required
          className="form-input"
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label htmlFor="subDesc" style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', display: 'block', marginBottom: 4 }}>
          Description
        </label>
        <input
          id="subDesc"
          type="text"
          value={subForm.description}
          onChange={(e) => updateSubForm('description', e.target.value)}
          placeholder="Description optionnelle"
          className="form-input"
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="subMaxScore" style={{ fontSize: 13, color: 'var(--tg-theme-hint-color)', display: 'block', marginBottom: 4 }}>
          Score max
        </label>
        <input
          id="subMaxScore"
          type="number"
          value={subForm.maxScore}
          onChange={(e) => updateSubForm('maxScore', Number(e.target.value))}
          min="1"
          className="form-input"
        />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submittingSub}>
          {submittingSub ? '⏳' : '✅'} Ajouter
        </button>
        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>
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
