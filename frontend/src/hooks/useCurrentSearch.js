import { useEffect, useState } from 'react';
import { searchesAPI } from '../api/api';
import { useSearchId } from './useSearch';

/**
 * Loads the current Search (assetType, description, pros/cons, …).
 */
export default function useCurrentSearch() {
  const searchId = useSearchId();
  const [search, setSearch] = useState(null);
  const [loading, setLoading] = useState(Boolean(searchId));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!searchId) {
      setSearch(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await searchesAPI.get(searchId);
        if (!cancelled) {
          setSearch(data.search);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setSearch(null);
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
  }, [searchId]);

  return {
    search,
    loading,
    error,
    setSearch,
    // Avoid defaulting to "home" while loading — boat Searches would briefly
    // hit /regions and surface a confusing "Not found" error.
    assetType: search?.assetType ?? null,
  };
}
