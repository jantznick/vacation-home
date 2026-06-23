import { useEffect, useState } from 'react';
import { useSearchAPI } from './useSearch';

export function primaryPoiLabel(pois) {
  if (!pois?.length) return null;
  const primary = pois.find((p) => p.isPrimary) || pois[0];
  return primary?.label || null;
}

export default function usePrimaryPoi() {
  const api = useSearchAPI();
  const [label, setLabel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const data = await api.pois.list();
        if (!cancelled) {
          setLabel(primaryPoiLabel(data.pois));
        }
      } catch {
        if (!cancelled) setLabel(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [api]);

  return { label, loading };
}
