import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { searchesAPI } from '../api/api';
import { searchPath } from '../hooks/useSearch';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import FormField from '../components/FormField';

const LAST_SEARCH_KEY = 'lastSearchId';

export function getLastSearchId() {
  return localStorage.getItem(LAST_SEARCH_KEY);
}

export function setLastSearchId(searchId) {
  if (searchId) {
    localStorage.setItem(LAST_SEARCH_KEY, searchId);
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

  useEffect(() => {
    const load = async () => {
      try {
        const data = await searchesAPI.list();
        setSearches(data.searches);

        const lastId = getLastSearchId();
        if (data.searches.length === 1 && !showPicker) {
          setLastSearchId(data.searches[0].id);
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

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setError('');

    try {
      const data = await searchesAPI.create({ name: name.trim() });
      setLastSearchId(data.search.id);
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
        description="Pick an existing search or create a new one. Each search is a shared workspace for regions, lakes, listings, and drive times."
      />

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-medium text-pine-900">Start a new search</h2>
          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            <FormField label="Search name" htmlFor="search-name">
              <input
                id="search-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Lake Geneva 2026"
                className="w-full rounded-md border border-pine-200 px-3 py-2"
                required
              />
            </FormField>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create search'}
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-lg font-medium text-pine-900">Open a search</h2>
          {searches.length === 0 ? (
            <p className="mt-3 text-sm text-pine-600">No searches yet — create one to get started.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {searches.map((search) => (
                <li key={search.id}>
                  <Link
                    to={searchPath(search.id)}
                    onClick={() => setLastSearchId(search.id)}
                    className="block rounded-md border border-pine-100 px-4 py-3 hover:bg-pine-50"
                  >
                    <p className="font-medium text-pine-900">{search.name}</p>
                    <p className="text-xs text-pine-500">
                      {search._count?.regions ?? 0} regions · {search._count?.listings ?? 0} listings · {search.role}
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
