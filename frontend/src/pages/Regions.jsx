import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSearchAPI, searchPath, useSearchId } from '../hooks/useSearch';
import Card from '../components/Card';
import ClickableCard from '../components/ClickableCard';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { formatDriveTime, statusLabel, REGION_STATUSES } from '../lib/format';
import useSearchAccess from '../hooks/useSearchAccess';

export default function Regions() {
  const searchId = useSearchId();
  const api = useSearchAPI();
  const { canEdit } = useSearchAccess();
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.regions.list();
        setRegions(data.regions);
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
        title="Regions"
        description="Broad areas you're considering, like Eagle River / Three Lakes."
        actions={canEdit ? (
          <Link to={searchPath(searchId, '/regions/new')}>
            <Button>Add region</Button>
          </Link>
        ) : undefined}
      />

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="text-pine-600">Loading regions...</p>
      ) : regions.length === 0 ? (
        <Card>
          <p className="text-sm text-pine-600">No regions yet. Add your first area to get started.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {regions.map((region) => (
            <ClickableCard key={region.id} to={searchPath(searchId, `/regions/${region.id}`)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-medium text-pine-900">{region.name}</p>
                  <p className="mt-1 text-sm text-pine-600">
                    {statusLabel(region.status, REGION_STATUSES)}
                  </p>
                </div>
                {region.overallScore && (
                  <span className="rounded-full bg-pine-100 px-3 py-1 text-sm font-medium text-pine-800">
                    {region.overallScore}/10
                  </span>
                )}
              </div>

              {region.description && (
                <p className="mt-3 text-sm text-pine-700 line-clamp-3">{region.description}</p>
              )}

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-pine-600">
                {region.driveTimeMinutes && <span>{formatDriveTime(region.driveTimeMinutes)} drive</span>}
                {region.driveDistanceMiles && <span>{region.driveDistanceMiles} miles</span>}
                <span>{region._count.lakes} lakes</span>
                <span>{region._count.listings} listings</span>
              </div>
            </ClickableCard>
          ))}
        </div>
      )}
    </div>
  );
}
