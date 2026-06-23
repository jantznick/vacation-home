import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { createSearchAPI } from '../api/api';

export function useSearchId() {
  const { searchId } = useParams();
  return searchId;
}

export function useSearchAPI() {
  const searchId = useSearchId();
  return useMemo(() => createSearchAPI(searchId), [searchId]);
}

export function searchPath(searchId, subpath = '') {
  const normalized = subpath.startsWith('/') ? subpath : `/${subpath}`;
  return `/searches/${searchId}${subpath ? normalized : ''}`;
}
