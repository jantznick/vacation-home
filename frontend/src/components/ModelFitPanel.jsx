import { useEffect, useState } from 'react';
import ModelFitChart from './ModelFitChart';

const TONE_BOX = {
  good: 'border-emerald-200 bg-emerald-50/80 text-emerald-900',
  caution: 'border-amber-200 bg-amber-50/80 text-amber-900',
  warning: 'border-amber-300 bg-amber-50 text-amber-950',
};

export default function ModelFitPanel({ api, modelId, trained }) {
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!trained || !expanded) {
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await api.pricingModels.fit(modelId);
        if (!cancelled) {
          setFeedback(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setFeedback(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [api, modelId, trained, expanded]);

  if (!trained) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-pine-100 pt-4">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-pine-200 bg-pine-50/60 px-4 py-3 text-left transition-colors hover:bg-pine-50"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <span>
          <span className="block text-sm font-medium text-pine-900">Model fit</span>
          <span className="mt-0.5 block text-xs text-pine-500">
            {expanded
              ? 'Chart and accuracy notes for the all-listings segment'
              : 'Chart, accuracy summary, and notes'}
          </span>
        </span>
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-lg font-medium text-pine-700 shadow-sm"
          aria-hidden
        >
          {expanded ? '−' : '+'}
        </span>
      </button>

      {expanded && (
        <div className="mt-4">
          {loading && (
            <p className="text-sm text-pine-600">Loading fit feedback…</p>
          )}

          {error && (
            <p className="text-sm text-red-700">{error}</p>
          )}

          {!loading && !error && !feedback?.available && (
            <>
              <h4 className="text-sm font-medium text-pine-900">How well does this fit?</h4>
              <p className="mt-2 text-sm text-pine-600">
                {feedback?.message || 'Fit feedback is not available yet.'}
              </p>
            </>
          )}

          {!loading && !error && feedback?.available && (
            <>
              <h4 className="text-sm font-medium text-pine-900">How well does this fit?</h4>
              <p className="mt-1 text-xs text-pine-500">
                All listings segment — compares model estimates to list prices on your saved homes.
              </p>

              <div className={`mt-3 rounded-xl border p-4 ${TONE_BOX[feedback.summary?.tone || 'good'] || TONE_BOX.good}`}>
                <p className="font-medium">{feedback.summary.headline}</p>
                <p className="mt-1 text-sm opacity-90">{feedback.summary.detail}</p>
              </div>

              {feedback.mixedListingNote && (
                <p className="mt-3 text-sm text-pine-600">{feedback.mixedListingNote}</p>
              )}

              {feedback.stabilizationNote && (
                <p className="mt-2 text-sm text-pine-600">{feedback.stabilizationNote}</p>
              )}

              <div className="mt-4">
                <ModelFitChart points={feedback.points} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
