import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function useSheetMode() {
  const [sheetMode, setSheetMode] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px), (hover: none)');
    const sync = () => setSheetMode(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return sheetMode;
}

/**
 * Hover (desktop) / tap sheet (mobile) helper for short explanations.
 * Mobile uses a bottom sheet so the copy always stays on-screen.
 */
export default function InfoTooltip({ tip, label }) {
  const tipId = useId();
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const sheetMode = useSheetMode();

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      const target = event.target;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || sheetMode) return undefined;

    const updateAnchor = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const panelWidth = Math.min(288, window.innerWidth - 24);
      const estimatedHeight = 160;
      const gap = 8;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const placeAbove = spaceBelow < estimatedHeight && rect.top > spaceBelow;

      let left = rect.left + rect.width / 2 - panelWidth / 2;
      left = Math.max(12, Math.min(left, window.innerWidth - panelWidth - 12));

      setAnchor({
        top: placeAbove ? undefined : rect.bottom + gap,
        bottom: placeAbove ? window.innerHeight - rect.top + gap : undefined,
        left,
        width: panelWidth,
      });
    };

    updateAnchor();
    window.addEventListener('scroll', updateAnchor, true);
    window.addEventListener('resize', updateAnchor);
    return () => {
      window.removeEventListener('scroll', updateAnchor, true);
      window.removeEventListener('resize', updateAnchor);
    };
  }, [open, sheetMode]);

  useEffect(() => {
    if (!open || !sheetMode) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, sheetMode]);

  if (!tip?.body) return null;

  const title = tip.title || label;

  const openTooltip = () => {
    setOpen(true);
  };

  const panel = open
    ? createPortal(
      sheetMode ? (
        <div className="fixed inset-0 z-[1300] flex items-end justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-pine-950/40"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div
            ref={panelRef}
            id={tipId}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'More info'}
            className="relative z-10 max-h-[70vh] w-full overflow-y-auto rounded-t-2xl border border-pine-200 bg-white p-5 shadow-2xl"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-pine-200" aria-hidden="true" />
            {title && (
              <p className="text-base font-semibold text-pine-950">{title}</p>
            )}
            <p className="mt-2 text-sm leading-relaxed text-pine-700">{tip.body}</p>
            <button
              type="button"
              className="mt-4 w-full rounded-lg bg-pine-800 px-3 py-2.5 text-sm font-medium text-white hover:bg-pine-900"
              onClick={() => setOpen(false)}
            >
              Got it
            </button>
          </div>
        </div>
      ) : anchor ? (
        <div
          ref={panelRef}
          id={tipId}
          role="tooltip"
          style={{
            position: 'fixed',
            top: anchor.top,
            bottom: anchor.bottom,
            left: anchor.left,
            width: anchor.width,
          }}
          className="z-[1300] rounded-xl border border-pine-200 bg-white p-3 text-left shadow-lg"
          onMouseEnter={openTooltip}
          onMouseLeave={() => setOpen(false)}
        >
          {title && (
            <p className="text-sm font-semibold text-pine-950">{title}</p>
          )}
          <p className="mt-1 text-sm leading-relaxed text-pine-700">{tip.body}</p>
        </div>
      ) : null,
      document.body,
    )
    : null;

  return (
    <span className="inline-flex align-middle">
      <button
        ref={buttonRef}
        type="button"
        className={`ml-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold leading-none transition-colors ${
          open
            ? 'border-pine-500 bg-pine-800 text-white'
            : 'border-pine-300 bg-white text-pine-500 hover:border-pine-500 hover:text-pine-800'
        }`}
        aria-label={title ? `About ${title}` : 'More info'}
        aria-expanded={open}
        aria-controls={tipId}
        onMouseEnter={() => {
          if (!sheetMode) openTooltip();
        }}
        onMouseLeave={(event) => {
          if (sheetMode) return;
          const next = event.relatedTarget;
          if (panelRef.current?.contains(next)) return;
          setOpen(false);
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        ?
      </button>
      {panel}
    </span>
  );
}
