export default function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}) {
  const variants = {
    primary: 'bg-pine-700 text-white hover:bg-pine-800',
    secondary: 'border border-pine-300 bg-white text-pine-800 hover:bg-pine-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    onDark: 'bg-white text-pine-900 shadow-sm hover:bg-pine-100',
    onDarkOutline:
      'border border-pine-400/70 bg-pine-800/40 text-pine-50 hover:border-pine-300 hover:bg-pine-700/80',
  };

  return (
    <button
      type="button"
      className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
