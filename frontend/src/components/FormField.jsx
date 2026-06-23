export default function FormField({ label, htmlFor, children, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-pine-800">
        {label}
      </label>
      {children}
    </div>
  );
}
