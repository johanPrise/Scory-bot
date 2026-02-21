export default function ListItem({ icon, title, subtitle, value, onClick, trailing }) {
  return (
    <div className="list-item" onClick={onClick} style={onClick ? { cursor: 'pointer' } : {}}>
      {icon && <div className="list-item-icon">{icon}</div>}
      <div className="list-item-content">
        <div className="list-item-title">{title}</div>
        {subtitle && <div className="list-item-subtitle">{subtitle}</div>}
      </div>
      {value !== undefined && <div className="list-item-value">{value}</div>}
      {trailing && trailing}
    </div>
  );
}
