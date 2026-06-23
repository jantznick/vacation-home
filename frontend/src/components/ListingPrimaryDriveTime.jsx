import { formatDriveTime } from '../lib/format';

export default function ListingPrimaryDriveTime({ minutes, poiLabel, className = 'text-xs text-pine-500' }) {
  if (minutes == null) return null;

  return (
    <p className={className}>
      {formatDriveTime(minutes)}
      {poiLabel ? ` from ${poiLabel}` : ''}
    </p>
  );
}
