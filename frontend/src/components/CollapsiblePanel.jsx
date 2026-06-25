import { useState } from 'react';

/** Section that collapses on small screens; always expanded from lg breakpoint up. */
export default function CollapsiblePanel({
  title,
  description,
  children,
  className = '',
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-pine-200 bg-pine-50/80 px-4 py-3 text-left lg:hidden"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          <span className="block text-base font-medium text-pine-900">{title}</span>
          {!open && description && (
            <span className="mt-0.5 block text-xs text-pine-500 line-clamp-1">{description}</span>
          )}
        </span>
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-lg font-medium text-pine-700 shadow-sm"
          aria-hidden
        >
          {open ? '−' : '+'}
        </span>
      </button>

      <div className={`${open ? 'mt-4 block' : 'hidden'} lg:mt-0 lg:block`}>
        <h2 className="hidden text-lg font-medium text-pine-900 lg:block">{title}</h2>
        {description && (
          <p className="mt-1 hidden text-sm text-pine-600 lg:block">{description}</p>
        )}
        {children}
      </div>
    </div>
  );
}
