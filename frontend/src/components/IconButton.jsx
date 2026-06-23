const variants = {
  default: 'text-pine-400 hover:bg-pine-50 hover:text-pine-700',
  danger: 'text-pine-400 hover:bg-red-50 hover:text-red-600',
};

export default function IconButton({
  label,
  onClick,
  variant = 'default',
  children,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-md p-2 transition-colors ${variants[variant]}`}
      aria-label={label}
    >
      {children}
    </button>
  );
}
