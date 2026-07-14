import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSearchAPI, searchPath, useSearchId } from '../hooks/useSearch';
import Card from '../components/Card';
import ClickableCard from '../components/ClickableCard';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import useSearchAccess from '../hooks/useSearchAccess';

export default function BoatMakes() {
  const searchId = useSearchId();
  const api = useSearchAPI();
  const { canEdit } = useSearchAccess();
  const [makes, setMakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.boatMakes.list();
        setMakes(data.makes);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [api]);

  return (
    <div>
      <PageHeader
        title="Makes & models"
        description="Capture what you like and dislike about yacht builders and specific models. Notes cascade onto each boat of that make/model."
        actions={canEdit ? (
          <Link to={searchPath(searchId, '/makes/new')}>
            <Button>Add make</Button>
          </Link>
        ) : undefined}
      />

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="text-pine-600">Loading makes...</p>
      ) : makes.length === 0 ? (
        <Card>
          <p className="text-sm text-pine-600">
            No makes yet. Add one, or save a boat with make/model filled in — they appear here automatically.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {makes.map((make) => (
            <ClickableCard key={make.id} to={searchPath(searchId, `/makes/${make.id}`)}>
              <p className="text-lg font-medium text-pine-900">{make.name}</p>
              {make.description && (
                <p className="mt-2 text-sm text-pine-700 line-clamp-3">{make.description}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-pine-600">
                <span>{make._count.models} {make._count.models === 1 ? 'model' : 'models'}</span>
                <span>{make._count.listings} {make._count.listings === 1 ? 'boat' : 'boats'}</span>
              </div>
            </ClickableCard>
          ))}
        </div>
      )}
    </div>
  );
}
