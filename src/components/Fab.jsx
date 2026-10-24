import { Link } from 'react-router-dom';

export default function Fab({ to, label }) {
  return (
    <Link to={to} className="fab">
      <span aria-hidden="true">＋</span>
      <span>{label}</span>
    </Link>
  );
}
