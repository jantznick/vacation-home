import { useEffect, useMemo, useRef, useState } from 'react';
import { assetTypeMeta } from '../lib/assetTypes';
import AssetTypeTabs from './AssetTypeTabs';

function ChevronDownIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CheckIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function SearchSwitcher({
  searches,
  currentSearchId,
  onSelect,
  onManage,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const current = searches.find((search) => search.id === currentSearchId);
  const [typeFilter, setTypeFilter] = useState(current?.assetType || 'home');

  useEffect(() => {
    setOpen(false);
  }, [currentSearchId]);

  useEffect(() => {
    if (current?.assetType) {
      setTypeFilter(current.assetType);
    }
  }, [current?.assetType]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const counts = useMemo(() => {
    const next = { home: 0, boat: 0, rv: 0 };
    for (const search of searches) {
      const key = search.assetType || 'home';
      next[key] = (next[key] || 0) + 1;
    }
    return next;
  }, [searches]);

  const filtered = searches.filter(
    (search) => (search.assetType || 'home') === typeFilter,
  );

  if (!searches.length) {
    return null;
  }

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Current search: ${current?.name ?? 'Unknown'}. Switch search.`}
        className="flex w-full min-w-0 items-center gap-2 rounded-md border border-pine-700 bg-pine-800 px-3 py-2 text-left text-sm text-white transition-colors hover:border-pine-600 hover:bg-pine-700/80 focus:border-pine-500 focus:outline-none focus:ring-1 focus:ring-pine-500"
      >
        <span className="min-w-0 flex-1 truncate font-medium">{current?.name ?? 'Search'}</span>
        <span className="hidden shrink-0 text-[10px] uppercase tracking-wide text-pine-400 sm:inline">
          {assetTypeMeta(current?.assetType).singular}
        </span>
        <ChevronDownIcon className={`h-4 w-4 shrink-0 text-pine-300 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[16rem] overflow-hidden rounded-lg border border-pine-200 bg-white shadow-lg sm:w-80">
          <div className="border-b border-pine-100 px-3 py-2">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-pine-500">Switch search</p>
            <AssetTypeTabs value={typeFilter} onChange={setTypeFilter} counts={counts} />
          </div>

          <ul role="listbox" aria-label="Your searches" className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-pine-500">
                No {assetTypeMeta(typeFilter).label.toLowerCase()} searches yet.
              </li>
            ) : (
              filtered.map((search) => {
                const isActive = search.id === currentSearchId;
                return (
                  <li key={search.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => {
                        onSelect(search.id);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                        isActive
                          ? 'bg-pine-50 text-pine-900'
                          : 'text-pine-800 hover:bg-pine-50'
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">{search.name}</span>
                      {isActive && <CheckIcon className="h-4 w-4 shrink-0 text-pine-700" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          <div className="border-t border-pine-100 p-1">
            <button
              type="button"
              onClick={() => {
                onManage();
                setOpen(false);
              }}
              className="flex w-full rounded-md px-3 py-2.5 text-left text-sm text-pine-700 transition-colors hover:bg-pine-50"
            >
              Manage searches…
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
