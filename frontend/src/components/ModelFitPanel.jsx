import { useEffect, useState } from 'react';
import ModelFitChart from './ModelFitChart';

const TONE_BOX = {
  good: 'border-emerald-200 bg-emerald-50/80 text-emerald-900',
  caution: 'border-amber-200 bg-amber-50/80 text-amber-900',
  warning: 'border-amber-300 bg-amber-50 text-amber-950',
};

export default function ModelFitPanel({ api, modelId, trained }) {
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!trained) {
      setFeedback(null);
      return;
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
  }, [api, modelId, trained]);

  if (!trained) {
    return null;
  }

  if (loading) {
    return (
      <div className="mt-4 border-t border-pine-100 pt-4">
        <p className="text-sm text-pine-600">Loading fit feedback…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 border-t border-pine-100 pt-4">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!feedback?.available) {
    return (
      <div className="mt-4 border-t border-pine-100 pt-4">
        <h4 className="text-sm font-medium text-pine-900">How well does this fit?</h4>
        <p className="mt-2 text-sm text-pine-600">
          {feedback?.message || 'Fit feedback is not available yet.'}
        </p>
      </div>
    );
  }

  const tone = feedback.summary?.tone || 'good';

  return (
    <div className="mt-4 border-t border-pine-100 pt-4">
      <h4 className="text-sm font-medium text-pine-900">How well does this fit?</h4>
      <p className="mt-1 text-xs text-pine-500">
        All listings segment — compares model estimates to list prices on your saved homes.
      </p>

      <div className={`mt-3 rounded-xl border p-4 ${TONE_BOX[tone] || TONE_BOX.good}`}>
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
    </div>
  );
}
