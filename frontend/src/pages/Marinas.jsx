import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSearchAPI, searchPath, useSearchId } from '../hooks/useSearch';
import useSearchAccess from '../hooks/useSearchAccess';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import ClickableCard from '../components/ClickableCard';
import Button from '../components/Button';
import { formatCurrency } from '../lib/format';

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function seasonLabel(marina) {
  if (marina.yearRound) return 'Year-round';
  if (marina.seasonOpen && marina.seasonClose) {
    return `${MONTH_ABBR[marina.seasonOpen - 1]}–${MONTH_ABBR[marina.seasonClose - 1]}`;
  }
  return null;
}

export default function Marinas() {
  const searchId = useSearchId();
  const api = useSearchAPI();
  const { canEdit } = useSearchAccess();
  const [marinas, setMarinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.marinas.list();
        setMarinas(data.marinas);
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
        title="Marinas"
        description="Marinas you're researching for keeping a boat — slip fees, storage, seasonality."
        actions={canEdit ? (
          <Link to={searchPath(searchId, '/marinas/new')}>
            <Button>Add marina</Button>
          </Link>
        ) : undefined}
      />

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="text-pine-600">Loading marinas...</p>
      ) : marinas.length === 0 ? (
        <Card>
          <p className="text-sm text-pine-600">
            No marinas yet. Add marinas to track slip fees, storage costs, and seasonality.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {marinas.map((marina) => (
            <ClickableCard key={marina.id} to={searchPath(searchId, `/marinas/${marina.id}`)}>
              <h3 className="text-lg font-semibold text-pine-900">{marina.name}</h3>
              {(marina.city || marina.state) && (
                <p className="mt-0.5 text-sm text-pine-600">
                  {[marina.city, marina.state].filter(Boolean).join(', ')}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-pine-700">
                {Array.isArray(marina.slipOptions) && marina.slipOptions.length > 0 && (
                  <span>{marina.slipOptions.length} slip option{marina.slipOptions.length !== 1 ? 's' : ''}</span>
                )}
                {marina.winterStorageCost != null && (
                  <span>{formatCurrency(marina.winterStorageCost)} winter</span>
                )}
                {seasonLabel(marina) && (
                  <span className="text-pine-500">{seasonLabel(marina)}</span>
                )}
              </div>
              {marina.overallScore != null && (
                <p className="mt-2 text-xs text-pine-500">Score: {marina.overallScore}/10</p>
              )}
              <p className="mt-1 text-xs text-pine-400">
                {marina._count.listings} {marina._count.listings === 1 ? 'boat' : 'boats'} linked
              </p>
            </ClickableCard>
          ))}
        </div>
      )}
    </div>
  );
}
