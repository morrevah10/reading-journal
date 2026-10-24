export default function StatTile({ label, value, note }) {
  return (
    <div className="stat-tile card">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {note && <span className="stat-note muted">{note}</span>}
    </div>
  );
}
