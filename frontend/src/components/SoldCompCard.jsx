import ClickableCard from './ClickableCard';

const soldCardClass =
  'relative overflow-hidden border-2 border-red-400 hover:border-red-500 focus:ring-red-400';

export default function SoldCompCard({ listing, to, children, className = '' }) {
  if (!listing?.isSoldComp) {
    return (
      <ClickableCard to={to} className={className}>
        {children}
      </ClickableCard>
    );
  }

  return (
    <ClickableCard to={to} className={`${soldCardClass} ${className}`}>
      <span
        className="pointer-events-none absolute -right-10 top-5 z-10 w-36 rotate-45 bg-red-600 py-1 text-center text-[10px] font-bold uppercase tracking-wider text-white shadow-md"
        aria-hidden="true"
      >
        Sold
      </span>
      {children}
    </ClickableCard>
  );
}
