import { useState } from 'react';
import Button from './Button';

/**
 * Editable newline-backed list (pros/cons). Parent owns the string value.
 */
export default function EditableLineList({
  label,
  value,
  onChange,
  placeholder = 'Add an item…',
  disabled = false,
}) {
  const lines = value
    ? String(value).split('\n').map((line) => line.trim()).filter(Boolean)
    : [];
  const [draft, setDraft] = useState('');

  const emit = (nextLines) => {
    onChange(nextLines.join('\n') || null);
  };

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    emit([...lines, trimmed]);
    setDraft('');
  };

  const handleRemove = (index) => {
    emit(lines.filter((_, i) => i !== index));
  };

  return (
    <div>
      {label && (
        <p className="mb-2 text-sm font-medium text-pine-800">{label}</p>
      )}
      {lines.length > 0 && (
        <ul className="mb-3 space-y-2">
          {lines.map((line, index) => (
            <li
              key={`${index}-${line}`}
              className="flex items-start gap-2 rounded-md border border-pine-100 bg-pine-50/50 px-3 py-2 text-sm text-pine-800"
            >
              <span className="min-w-0 flex-1">{line}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="shrink-0 text-xs text-pine-500 hover:text-red-600"
                  aria-label={`Remove: ${line}`}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!disabled && (
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder={placeholder}
            className="min-w-0 flex-1 rounded-md border border-pine-200 px-3 py-2 text-sm"
          />
          <Button type="button" variant="secondary" onClick={handleAdd} disabled={!draft.trim()}>
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
