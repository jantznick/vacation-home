export function mapsUrl(latitude, longitude) {
  if (latitude == null || longitude == null) {
    return null;
  }
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

export function formatCoordinates(latitude, longitude) {
  if (latitude == null || longitude == null) {
    return null;
  }
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}
