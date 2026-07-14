import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { searchesAPI } from '../api/api';
import { searchPath } from '../hooks/useSearch';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import FormField from '../components/FormField';
import AssetTypeTabs, { AssetTypeBadge } from '../components/AssetTypeTabs';
import { ASSET_TYPE_OPTIONS, assetTypeMeta, supportsRegions } from '../lib/assetTypes';

const LAST_SEARCH_KEY = 'lastSearchId';
const LAST_ASSET_TYPE_KEY = 'lastAssetType';

export function getLastSearchId() {
  return localStorage.getItem(LAST_SEARCH_KEY);
}

export function setLastSearchId(searchId) {
  if (searchId) {
    localStorage.setItem(LAST_SEARCH_KEY, searchId);
  }
}

function getLastAssetType() {
  return localStorage.getItem(LAST_ASSET_TYPE_KEY) || 'home';
}

function setLastAssetType(assetType) {
  if (assetType) {
    localStorage.setItem(LAST_ASSET_TYPE_KEY, assetType);
  }
}

export default function Searches() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showPicker = searchParams.get('manage') === '1';
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState(getLastAssetType);
  const [typeFilter, setTypeFilter] = useState(getLastAssetType);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await searchesAPI.list();
        setSearches(data.searches);

        const lastId = getLastSearchId();
        if (data.searches.length === 1 && !showPicker) {
          setLastSearchId(data.searches[0].id);
          setLastAssetType(data.searches[0].assetType || 'home');
          navigate(searchPath(data.searches[0].id), { replace: true });
        } else if (lastId && data.searches.some((s) => s.id === lastId) && !showPicker) {
          navigate(searchPath(lastId), { replace: true });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigate, showPicker]);

  const counts = useMemo(() => {
    const next = { home: 0, boat: 0, rv: 0 };
    for (const search of searches) {
      const key = search.assetType || 'home';
      next[key] = (next[key] || 0) + 1;
    }
    return next;
  }, [searches]);

  const filteredSearches = searches.filter(
    (search) => (search.assetType || 'home') === typeFilter,
  );

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setError('');

    try {
      const data = await searchesAPI.create({ name: name.trim(), assetType });
      setLastSearchId(data.search.id);
      setLastAssetType(data.search.assetType || assetType);
      navigate(searchPath(data.search.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <p className="text-pine-600">Loading searches...</p>;
  }

  return (
    <div>
      <PageHeader
        title="Your searches"
        description="Pick Homes or Boats, then open a search workspace you share with collaborators."
      />

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="mb-6">
        <AssetTypeTabs
          value={typeFilter}
          onChange={(next) => {
            setTypeFilter(next);
            setLastAssetType(next);
            setAssetType(next);
          }}
          counts={counts}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-medium text-pine-900">
            Start a new {assetTypeMeta(assetType).singular} search
          </h2>
          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            <FormField label="Vacation type" htmlFor="asset-type">
              <select
                id="asset-type"
                value={assetType}
                onChange={(e) => {
                  setAssetType(e.target.value);
                  setTypeFilter(e.target.value);
                  setLastAssetType(e.target.value);
                }}
                className="w-full rounded-md border border-pine-200 px-3 py-2"
              >
                {ASSET_TYPE_OPTIONS.map((type) => (
                  <option key={type.key} value={type.key}>{type.label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Search name" htmlFor="search-name">
              <input
                id="search-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  assetType === 'boat' ? 'Great Lakes sail 2026' : 'Lake Geneva 2026'
                }
                className="w-full rounded-md border border-pine-200 px-3 py-2"
                required
              />
            </FormField>
            <p className="text-xs text-pine-500">
              {supportsRegions(assetType)
                ? 'Organize lakeside areas, listings, and price research in one place.'
                : 'Track sail and motor boats, compare prices, and keep notes as you narrow down.'}
            </p>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating...' : `Create ${assetTypeMeta(assetType).singular} search`}
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-lg font-medium text-pine-900">
            Open a {assetTypeMeta(typeFilter).singular} search
          </h2>
          {filteredSearches.length === 0 ? (
            <p className="mt-3 text-sm text-pine-600">
              No {assetTypeMeta(typeFilter).label.toLowerCase()} searches yet — create one to get started.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {filteredSearches.map((search) => (
                <li key={search.id}>
                  <Link
                    to={searchPath(search.id)}
                    onClick={() => {
                      setLastSearchId(search.id);
                      setLastAssetType(search.assetType || 'home');
                    }}
                    className="block rounded-md border border-pine-100 px-4 py-3 hover:bg-pine-50"
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-pine-900">{search.name}</p>
                      <AssetTypeBadge assetType={search.assetType} />
                    </div>
                    <p className="text-xs text-pine-500">
                      {supportsRegions(search.assetType)
                        ? `${search._count?.regions ?? 0} regions · `
                        : ''}
                      {search._count?.listings ?? 0} listings · {search.role}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
