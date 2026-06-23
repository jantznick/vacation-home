import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../api/api';
import { searchPath } from '../hooks/useSearch';
import { getLastSearchId } from './Searches';
import useAuthStore from '../store/authStore';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';

export default function Profile() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const lastSearchId = getLastSearchId();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await authAPI.me();
        setUser(data.user);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [setUser]);

  if (loading) {
    return <p className="text-pine-600">Loading account...</p>;
  }

  return (
    <div>
      <PageHeader
        title="Account"
        description="Your login and membership. Drive times and map routes use locations in each search's settings."
      />

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <Card className="max-w-lg">
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-pine-500">Email</dt>
            <dd className="text-pine-900">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-pine-500">Member since</dt>
            <dd className="text-pine-900">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString()
                : '—'}
            </dd>
          </div>
        </dl>

        {lastSearchId && (
          <p className="mt-6 text-sm text-pine-600">
            To update where drive times start from, go to{' '}
            <Link
              to={searchPath(lastSearchId, '/settings')}
              className="font-medium text-pine-700 hover:text-pine-900"
            >
              Search settings
            </Link>
            .
          </p>
        )}
      </Card>
    </div>
  );
}
