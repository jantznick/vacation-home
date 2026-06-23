import { useEffect, useMemo, useState } from 'react';
import { useSearchAPI, useSearchId } from '../hooks/useSearch';
import MapPanel, { buildPoiMarker } from './MapPanel';

/**
 * Map with optional driving route from primary POI to a destination.
 */
export default function RouteMap({
  destination,
  destinationType = 'listing',
  destinationLabel,
  destinationSublabel,
  destinationHref,
  radiusMiles,
  height,
  className = '',
}) {
  const searchId = useSearchId();
  const api = useSearchAPI();
  const [primaryPoi, setPrimaryPoi] = useState(null);
  const [routePoints, setRoutePoints] = useState(null);
  const [routeError, setRouteError] = useState('');
  const [loadingRoute, setLoadingRoute] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadOverview = async () => {
      try {
        const data = await api.maps.overview();
        if (!cancelled) {
          setPrimaryPoi(data.primaryPoi);
        }
      } catch {
        if (!cancelled) {
          setPrimaryPoi(null);
        }
      }
    };

    loadOverview();

    return () => {
      cancelled = true;
    };
  }, [api]);

  const destinationMarker = useMemo(() => {
    if (destination?.latitude == null || destination?.longitude == null) {
      return null;
    }

    return {
      id: `dest-${destination.id || destinationType}`,
      type: destinationType,
      latitude: destination.latitude,
      longitude: destination.longitude,
      label: destinationLabel,
      sublabel: destinationSublabel,
      href: destinationHref,
    };
  }, [destination, destinationType, destinationLabel, destinationSublabel, destinationHref]);

  const poiMarker = useMemo(
    () => buildPoiMarker(primaryPoi, searchId),
    [primaryPoi, searchId],
  );

  const markers = useMemo(
    () => [poiMarker, destinationMarker].filter(Boolean),
    [poiMarker, destinationMarker],
  );

  const circles = useMemo(() => {
    if (
      radiusMiles == null
      || radiusMiles <= 0
      || destination?.latitude == null
      || destination?.longitude == null
    ) {
      return [];
    }

    return [{
      id: `radius-${destination.id}`,
      latitude: destination.latitude,
      longitude: destination.longitude,
      radiusMeters: radiusMiles * 1609.34,
      color: '#2563eb',
    }];
  }, [radiusMiles, destination]);

  useEffect(() => {
    if (!poiMarker || !destinationMarker) {
      setRoutePoints(null);
      setRouteError('');
      return;
    }

    let cancelled = false;

    const loadRoute = async () => {
      setLoadingRoute(true);
      setRouteError('');

      try {
        const data = await api.maps.route(
          destinationMarker.latitude,
          destinationMarker.longitude,
          primaryPoi?.id,
        );
        if (!cancelled) {
          setRoutePoints(data.route.points);
        }
      } catch (err) {
        if (!cancelled) {
          setRoutePoints(null);
          setRouteError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoadingRoute(false);
        }
      }
    };

    loadRoute();

    return () => {
      cancelled = true;
    };
  }, [
    api,
    primaryPoi?.id,
    poiMarker?.latitude,
    poiMarker?.longitude,
    destinationMarker?.latitude,
    destinationMarker?.longitude,
  ]);

  return (
    <div>
      <MapPanel
        markers={markers}
        circles={circles}
        route={routePoints}
        height={height}
        className={className}
        emptyMessage="Set a location to see it on the map."
      />
      {loadingRoute && (
        <p className="mt-2 text-xs text-pine-500">Loading driving route...</p>
      )}
      {routeError && (
        <p className="mt-2 text-xs text-amber-700">{routeError}</p>
      )}
      {!poiMarker && destinationMarker && (
        <p className="mt-2 text-xs text-pine-500">
          Add a location in Settings to see the driving route.
        </p>
      )}
    </div>
  );
}
