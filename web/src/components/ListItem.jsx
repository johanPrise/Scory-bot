import PropTypes from 'prop-types';

export default function ListItem({ icon, title, subtitle, value, onClick, trailing }) {
  const isClickable = Boolean(onClick);
  const content = (
    <>
      {icon && <div className="list-item-icon">{icon}</div>}
      <div className="list-item-content">
        <div className="list-item-title">{title}</div>
        {subtitle && <div className="list-item-subtitle">{subtitle}</div>}
      </div>
      {value !== undefined && <div className="list-item-value">{value}</div>}
      {trailing}
    </>
  );

  if (isClickable) {
    return (
      <button
        type="button"
        className="list-item clickable"
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="list-item">
      {content}
    </div>
  );
}

ListItem.propTypes = {
  icon: PropTypes.node,
  title: PropTypes.node.isRequired,
  subtitle: PropTypes.node,
  value: PropTypes.node,
  onClick: PropTypes.func,
  trailing: PropTypes.node,
};
