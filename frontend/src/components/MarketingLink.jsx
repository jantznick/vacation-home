import { Link } from 'react-router-dom';

const base =
  'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium transition-colors';

const variants = {
  primary: `${base} bg-pine-700 text-white shadow-sm hover:bg-pine-800`,
  secondary: `${base} border border-pine-300 bg-white text-pine-800 hover:bg-pine-50`,
  onDark: `${base} bg-white text-pine-900 shadow-sm hover:bg-pine-100`,
  onDarkOutline: `${base} border border-pine-400/70 bg-pine-800/40 text-pine-50 hover:border-pine-300 hover:bg-pine-700/80`,
  ghost: `${base} text-pine-700 hover:bg-pine-50 hover:text-pine-900`,
};

export default function MarketingLink({
  to,
  href,
  variant = 'primary',
  className = '',
  children,
  ...props
}) {
  const classes = `${variants[variant] || variants.primary} ${className}`.trim();

  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    );
  }

  return (
    <Link to={to} className={classes} {...props}>
      {children}
    </Link>
  );
}
