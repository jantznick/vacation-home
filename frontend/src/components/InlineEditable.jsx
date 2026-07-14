import { useEffect, useRef, useState } from 'react';

const inputClass =
  'w-full rounded-lg border border-pine-300 bg-white px-2.5 py-1.5 text-sm text-pine-900 shadow-sm focus:border-pine-500 focus:outline-none focus:ring-2 focus:ring-pine-200';

/**
 * Click a value to edit it in place. Saves on blur/Enter (Escape cancels).
 */
export default function InlineEditable({
  value,
  display,
  onSave,
  type = 'text',
  options = null,
  placeholder = 'Add…',
  canEdit = false,
  className = '',
  displayClassName = '',
  emptyClassName = 'text-pine-400',
  parse = (raw) => raw,
  formatDraft = (current) => (current == null ? '' : String(current)),
  multiline = false,
  ariaLabel,
  autoEdit = false,
  onCancelEdit,
}) {
  const [editing, setEditing] = useState(Boolean(autoEdit && canEdit));
  const [draft, setDraft] = useState(() => formatDraft(value));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoEdit && canEdit) {
      setDraft(formatDraft(value));
      setEditing(true);
    }
  }, [autoEdit, canEdit]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (type !== 'select' && !multiline) {
        inputRef.current.select?.();
      }
    }
  }, [editing, type, multiline]);

  if (!canEdit) {
    const shown = display ?? value;
    return (
      <span className={`${shown == null || shown === '' ? emptyClassName : displayClassName} ${className}`}>
        {shown == null || shown === '' ? placeholder : shown}
      </span>
    );
  }

  const startEdit = (event) => {
    event?.stopPropagation?.();
    setDraft(formatDraft(value));
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setDraft('');
    onCancelEdit?.();
  };

  const commit = async () => {
    if (saving) return;
    let next;
    try {
      next = parse(draft);
    } catch {
      cancel();
      return;
    }

    const current = value == null ? null : value;
    const normalizedNext = next === '' || next === undefined ? null : next;
    if (String(normalizedNext ?? '') === String(current ?? '')) {
      cancel();
      return;
    }

    setSaving(true);
    try {
      await onSave(normalizedNext);
      setEditing(false);
      onCancelEdit?.();
    } catch {
      // Parent shows toast/error; keep editing open.
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    if (options) {
      return (
        <select
          ref={inputRef}
          className={`${inputClass} ${className}`}
          value={draft}
          disabled={saving}
          aria-label={ariaLabel}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (multiline) {
      return (
        <textarea
          ref={inputRef}
          className={`${inputClass} min-h-[88px] ${className}`}
          value={draft}
          disabled={saving}
          aria-label={ariaLabel}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      );
    }

    return (
      <input
        ref={inputRef}
        type={type}
        className={`${inputClass} ${className}`}
        value={draft}
        disabled={saving}
        aria-label={ariaLabel}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
          }
        }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  const shown = display ?? value;
  const empty = shown == null || shown === '';

  return (
    <button
      type="button"
      onClick={startEdit}
      className={`rounded-md text-left transition-colors hover:bg-pine-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine-300 ${
        empty ? emptyClassName : displayClassName
      } ${className}`}
      aria-label={ariaLabel || (empty ? placeholder : 'Edit')}
    >
      {empty ? placeholder : shown}
    </button>
  );
}

export function FeaturePill({ children, onClick, canEdit = false, title }) {
  const base =
    'inline-flex items-center gap-1.5 rounded-full border border-pine-200/80 bg-white/80 px-3 py-1 text-sm text-pine-800 shadow-sm backdrop-blur-sm';

  if (canEdit && onClick) {
    return (
      <button
        type="button"
        title={title || 'Click to edit'}
        onClick={onClick}
        className={`${base} transition-colors hover:border-pine-400 hover:bg-pine-50`}
      >
        {children}
      </button>
    );
  }

  return <span className={base}>{children}</span>;
}
