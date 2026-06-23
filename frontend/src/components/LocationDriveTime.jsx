import Button from './Button';
import { formatNumber, formatDriveTime } from '../lib/format';
import { formatCoordinates, mapsUrl } from '../lib/maps';

export default function LocationDriveTime({
  locationLabel,
  addressLine,
  latitude,
  longitude,
  driveTimeMinutes,
  driveDistanceMiles,
  onGeocode,
  onDriveTime,
  geocoding = false,
  calculating = false,
  error = '',
  originLabel = 'your primary location',
  embedded = false,
  radiusMiles,
}) {
  const hasCoordinates = latitude != null && longitude != null;
  const mapUrl = mapsUrl(latitude, longitude);

  const wrapperClass = embedded
    ? 'border-t border-pine-100 pt-4'
    : 'rounded-lg border border-pine-200 p-4';

  return (
    <div className={wrapperClass}>
      <h3 className="text-sm font-medium text-pine-900">{locationLabel}</h3>

      {addressLine && (
        <p className="mt-1 text-sm text-pine-700">{addressLine}</p>
      )}

      {radiusMiles != null && radiusMiles > 0 && (
        <p className="mt-1 text-sm text-pine-600">
          {formatNumber(radiusMiles, ' mi')} radius from center
        </p>
      )}

      {hasCoordinates ? (
        <p className="mt-2 break-words text-sm text-pine-600">
          {formatCoordinates(latitude, longitude)}
          {mapUrl && (
            <>
              {' · '}
              <a
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-pine-700 hover:text-pine-900"
              >
                Open in Maps
              </a>
            </>
          )}
        </p>
      ) : (
        <p className="mt-2 text-sm text-pine-500">Map pin not set — look up the location to enable the map and routes.</p>
      )}

      {(driveTimeMinutes != null || driveDistanceMiles != null) && (
        <p className="mt-3 text-sm text-pine-900">
          <span className="font-medium">{formatDriveTime(driveTimeMinutes)}</span>
          {driveDistanceMiles != null && (
            <span className="text-pine-600"> · {formatNumber(driveDistanceMiles, ' mi')}</span>
          )}
          <span className="text-pine-500"> from {originLabel}</span>
        </p>
      )}

      {error && (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {onGeocode && !hasCoordinates && (
          <Button variant="secondary" onClick={onGeocode} disabled={geocoding}>
            {geocoding ? 'Looking up...' : 'Look up location'}
          </Button>
        )}
        {onDriveTime && (
          <Button variant="secondary" onClick={onDriveTime} disabled={calculating}>
            {calculating ? 'Calculating...' : (
              <>
                <span className="sm:hidden">Drive time</span>
                <span className="hidden sm:inline">Calculate drive time</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
