import { Link } from 'react-router-dom';

const baseClass =
  'block rounded-xl border border-pine-200 bg-white p-5 shadow-sm transition-colors hover:border-pine-300 hover:bg-pine-50 focus:outline-none focus:ring-2 focus:ring-pine-400 focus:ring-offset-2';

export default function ClickableCard({ to, children, className = '' }) {
  return (
    <Link to={to} className={`${baseClass} ${className}`}>
      {children}
    </Link>
  );
}

export function ClickableRow({ to, children, className = '', stackOnMobile = false }) {
  return (
    <Link
      to={to}
      className={`flex gap-3 rounded-lg px-2 py-2 -mx-2 transition-colors hover:bg-pine-50 focus:outline-none focus:ring-2 focus:ring-pine-400 focus:ring-offset-2 ${
        stackOnMobile
          ? 'flex-col items-start sm:flex-row sm:items-center sm:justify-between'
          : 'items-center justify-between'
      } ${className}`}
    >
      {children}
    </Link>
  );
}
