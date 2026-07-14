import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Card from './Card';

function dedupePhotoUrls(urls) {
  const seen = new Set();

  return urls.filter((url) => {
    const match = url.match(/\/fp\/([^-/]+)/);
    const key = match ? match[1] : url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function ChevronLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function useScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;

    const html = document.documentElement;
    const { body } = document;
    const previous = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPaddingRight: body.style.paddingRight,
    };

    const scrollbarGap = window.innerWidth - html.clientWidth;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (scrollbarGap > 0) {
      body.style.paddingRight = `${scrollbarGap}px`;
    }

    return () => {
      html.style.overflow = previous.htmlOverflow;
      body.style.overflow = previous.bodyOverflow;
      body.style.paddingRight = previous.bodyPaddingRight;
    };
  }, [active]);
}

function PhotoLightbox({ photos, index, onClose, onChangeIndex }) {
  const photo = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) onChangeIndex(index - 1);
  }, [hasPrev, index, onChangeIndex]);

  const goNext = useCallback(() => {
    if (hasNext) onChangeIndex(index + 1);
  }, [hasNext, index, onChangeIndex]);

  useScrollLock(true);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') goPrev();
      if (event.key === 'ArrowRight') goNext();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goPrev, goNext]);

  return createPortal(
    <div
      // Above Layout sticky header (z-[1100]); portal avoids stacking-context traps.
      className="fixed inset-0 z-[1200] flex flex-col overscroll-none bg-black/90"
      onClick={onClose}
      onWheel={(event) => event.preventDefault()}
      onTouchMove={(event) => event.preventDefault()}
      role="presentation"
    >
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <p className="text-sm">
          {index + 1} / {photos.length}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close gallery"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 pb-4">
        {hasPrev && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goPrev();
            }}
            className="absolute left-2 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70 sm:left-4"
            aria-label="Previous photo"
          >
            <ChevronLeftIcon />
          </button>
        )}

        <img
          src={photo}
          alt={`Listing photo ${index + 1} of ${photos.length}`}
          className="max-h-[calc(100vh-8rem)] max-w-full object-contain"
          onClick={(event) => event.stopPropagation()}
        />

        {hasNext && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goNext();
            }}
            className="absolute right-2 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70 sm:right-4"
            aria-label="Next photo"
          >
            <ChevronRightIcon />
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default function PhotoGallery({ photoUrls }) {
  const photos = useMemo(() => dedupePhotoUrls(photoUrls ?? []), [photoUrls]);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  if (!photos.length) {
    return null;
  }

  const openLightbox = (index) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  return (
    <>
      <Card>
        <h2 className="text-lg font-medium text-pine-900">
          Photos
          <span className="ml-2 text-sm font-normal text-pine-500">({photos.length})</span>
        </h2>

        <div className="mt-4 -mx-1 flex gap-3 overflow-x-auto px-1 pb-2 snap-x snap-mandatory scroll-smooth">
          {photos.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => openLightbox(index)}
              className="group relative h-28 w-40 shrink-0 snap-start overflow-hidden rounded-lg border border-pine-200 bg-pine-100 focus:outline-none focus:ring-2 focus:ring-pine-400 focus:ring-offset-2"
            >
              <img
                src={url}
                alt={`Listing photo ${index + 1}`}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </Card>

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          index={lightboxIndex}
          onClose={closeLightbox}
          onChangeIndex={setLightboxIndex}
        />
      )}
    </>
  );
}
