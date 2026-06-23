import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSearchAPI, searchPath, useSearchId } from '../hooks/useSearch';
import Card from '../components/Card';
import MapPanel, {
  buildListingMarker,
  buildPoiMarker,
  buildRegionMarker,
} from '../components/MapPanel';
import PageHeader from '../components/PageHeader';
import { formatNumber, formatDriveTime } from '../lib/format';

export default function MapOverview() {
  const searchId = useSearchId();
  const api = useSearchAPI();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const overview = await api.maps.overview();
        setData(overview);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [api]);

  const markers = useMemo(() => {
    if (!data) return [];

    const poiMarkers = (data.pois || [])
      .map((poi) => buildPoiMarker(poi, searchId))
      .filter(Boolean);

    const regionMarkers = (data.regions || [])
      .map((region) => buildRegionMarker(region, searchId))
      .filter(Boolean);

    const listingMarkers = (data.listings || [])
      .map((listing) => buildListingMarker(listing, searchId))
      .filter(Boolean);

    return [...poiMarkers, ...regionMarkers, ...listingMarkers];
  }, [data, searchId]);

  if (loading) {
    return <p className="text-pine-600">Loading map...</p>;
  }

  return (
    <div>
      <PageHeader
        title="Map"
        description="Your locations, regions, and listings that have a map pin."
      />

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <Card className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-4 text-sm text-pine-700">
          <span className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-[#166534]" />
            Location
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-[#2563eb]" />
            Region
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-[#ea580c]" />
            Listing
          </span>
        </div>

        <MapPanel
          markers={markers}
          emptyMessage="Add locations in Settings, then set a center on regions or an address on listings."
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-medium text-pine-900">Regions on map</h2>
          {data?.regions?.length ? (
            <ul className="mt-4 space-y-2 text-sm">
              {data.regions.map((region) => (
                <li key={region.id} className="flex items-center justify-between gap-3">
                  <Link to={searchPath(searchId, `/regions/${region.id}`)} className="font-medium text-pine-800 hover:text-pine-950">
                    {region.name}
                  </Link>
                  {region.driveTimeMinutes != null && (
                    <span className="text-pine-500">{formatDriveTime(region.driveTimeMinutes)}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-pine-600">
              No regions on the map yet. Add a center location when editing a region.
            </p>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-medium text-pine-900">Listings on map</h2>
          {data?.listings?.length ? (
            <ul className="mt-4 space-y-2 text-sm">
              {data.listings.map((listing) => (
                <li key={listing.id} className="flex items-center justify-between gap-3">
                  <Link to={searchPath(searchId, `/listings/${listing.id}`)} className="font-medium text-pine-800 hover:text-pine-950">
                    {listing.address || 'Untitled listing'}
                  </Link>
                  {listing.driveTimeMinutes != null && (
                    <span className="text-pine-500">{formatDriveTime(listing.driveTimeMinutes)}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-pine-600">
              No listings on the map yet. Add an address or look up the location on a listing.
            </p>
          )}
        </Card>
      </div>

      {!data?.primaryPoi && (
        <p className="mt-4 text-sm text-pine-600">
          <Link to={searchPath(searchId, '/settings')} className="font-medium text-pine-700 hover:text-pine-900">
            Add a location in Settings
          </Link>
          {' '}to see it on the map and get driving routes.
        </p>
      )}
    </div>
  );
}
