import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchesAPI } from '../api/api';
import { searchPath, useSearchId } from './useSearch';

export default function useSearchAccess({ redirectIfViewer = false } = {}) {
  const searchId = useSearchId();
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!searchId) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const data = await searchesAPI.get(searchId);
        if (cancelled) return;

        const memberRole = data.search.role;
        setRole(memberRole);

        if (redirectIfViewer && memberRole === 'viewer') {
          navigate(searchPath(searchId), { replace: true });
        }
      } catch {
        if (!cancelled) setRole(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [searchId, redirectIfViewer, navigate]);

  const canEdit = role === 'owner' || role === 'editor';
  const isOwner = role === 'owner';
  const isViewer = role === 'viewer';

  return { role, canEdit, isOwner, isViewer, loading };
}
