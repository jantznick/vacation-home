import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Circle,
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { searchPath } from '../hooks/useSearch';

const MARKER_COLORS = {
  home: '#166534',
  region: '#2563eb',
  listing: '#ea580c',
};

function FitBounds({ markers, routePositions }) {
  const map = useMap();

  useEffect(() => {
    const points = [
      ...markers.map((marker) => [marker.latitude, marker.longitude]),
      ...routePositions,
    ];

    if (points.length === 0) {
      return;
    }

    const sync = () => {
      map.invalidateSize({ pan: false });

      if (points.length === 1) {
        map.setView(points[0], 10);
        return;
      }

      map.fitBounds(points, { padding: [48, 48] });
    };

    // Defer until Leaflet has laid out the container (e.g. after map first mounts).
    const frame = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(frame);
  }, [map, markers, routePositions]);

  return null;
}

export default function MapPanel({
  markers = [],
  route = null,
  circles = [],
  height,
  className = '',
  emptyMessage = 'No locations to show on the map yet.',
}) {
  const mapHeightClass = height ? '' : 'h-[min(50vh,520px)] min-h-[240px]';
  const mapStyle = height ? { height } : undefined;
  const routePositions = useMemo(
    () => route?.map((point) => [point.latitude, point.longitude]) ?? [],
    [route],
  );
  const routeKey = routePositions.length > 0
    ? routePositions.map(([lat, lng]) => `${lat},${lng}`).join('|')
    : 'no-route';

  if (!markers.length && !circles.length) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-dashed border-pine-300 bg-pine-50 px-4 text-sm text-pine-600 ${mapHeightClass} ${className}`}
        style={mapStyle}
      >
        {emptyMessage}
      </div>
    );
  }

  const center = markers.length
    ? [markers[0].latitude, markers[0].longitude]
    : [circles[0].latitude, circles[0].longitude];

  return (
    <div className={`relative isolate overflow-hidden rounded-lg border border-pine-200 ${mapHeightClass} ${className}`} style={mapStyle}>
      <MapContainer
        center={center}
        zoom={8}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds markers={markers} routePositions={routePositions} />

        {routePositions.length > 0 && (
          <Polyline
            key={routeKey}
            positions={routePositions}
            pathOptions={{ color: '#166534', weight: 4, opacity: 0.85 }}
          />
        )}

        {circles.map((circle) => (
          <Circle
            key={circle.id}
            center={[circle.latitude, circle.longitude]}
            radius={circle.radiusMeters}
            pathOptions={{
              color: circle.color || '#2563eb',
              weight: 2,
              fillColor: circle.color || '#2563eb',
              fillOpacity: 0.12,
            }}
          />
        ))}

        {markers.map((marker) => (
          <CircleMarker
            key={marker.id}
            center={[marker.latitude, marker.longitude]}
            radius={marker.type === 'home' ? 9 : 8}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: MARKER_COLORS[marker.type] || MARKER_COLORS.listing,
              fillOpacity: 0.95,
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-medium text-pine-900">{marker.label}</p>
                {marker.sublabel && (
                  <p className="mt-1 text-pine-600">{marker.sublabel}</p>
                )}
                {marker.href && (
                  <Link to={marker.href} className="mt-2 inline-block font-medium text-pine-700 hover:text-pine-900">
                    View details
                  </Link>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

export function buildPoiMarker(poi, searchId) {
  if (poi?.latitude == null || poi?.longitude == null) {
    return null;
  }

  const parts = [poi.address, poi.city, poi.state].filter(Boolean);

  return {
    id: `poi-${poi.id}`,
    type: 'home',
    latitude: poi.latitude,
    longitude: poi.longitude,
    label: poi.label || 'POI',
    sublabel: parts.join(', ') || undefined,
    href: searchId ? searchPath(searchId, '/settings') : undefined,
  };
}

export function buildRegionMarker(region, searchId) {
  if (region?.latitude == null || region?.longitude == null) {
    return null;
  }

  return {
    id: `region-${region.id}`,
    type: 'region',
    latitude: region.latitude,
    longitude: region.longitude,
    label: region.name,
    sublabel: region.centerAddress || undefined,
    href: searchId
      ? searchPath(searchId, `/regions/${region.id}`)
      : `/regions/${region.id}`,
  };
}

export function buildListingMarker(listing, searchId) {
  if (listing?.latitude == null || listing?.longitude == null) {
    return null;
  }

  const address = [listing.address, listing.city, listing.state].filter(Boolean).join(', ');

  return {
    id: `listing-${listing.id}`,
    type: 'listing',
    latitude: listing.latitude,
    longitude: listing.longitude,
    label: listing.address || 'Listing',
    sublabel: address || listing.region?.name,
    href: searchId
      ? searchPath(searchId, `/listings/${listing.id}`)
      : `/listings/${listing.id}`,
  };
}
