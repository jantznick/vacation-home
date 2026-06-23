function getApiKey() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key?.trim()) {
    throw new Error('GOOGLE_MAPS_API_KEY is not configured');
  }
  return key.trim();
}

async function mapsRequest(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Google Maps API returned HTTP ${response.status}`);
  }

  const data = await response.json();

  if (data.status === 'REQUEST_DENIED') {
    throw new Error(data.error_message || 'Google Maps API request denied. Check your API key and enabled APIs.');
  }

  if (data.status === 'OVER_QUERY_LIMIT') {
    throw new Error('Google Maps API quota exceeded');
  }

  if (data.status === 'INVALID_REQUEST') {
    throw new Error(data.error_message || 'Invalid Google Maps API request');
  }

  return data;
}

export async function geocodeAddress(address) {
  if (!address?.trim()) {
    throw new Error('Address is required for geocoding');
  }

  const key = getApiKey();
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address.trim());
  url.searchParams.set('key', key);

  const data = await mapsRequest(url);

  if (data.status === 'ZERO_RESULTS') {
    throw new Error(`Could not find a location for: ${address}`);
  }

  if (data.status !== 'OK' || !data.results?.length) {
    throw new Error(`Geocoding failed (${data.status})`);
  }

  const result = data.results[0];
  const { lat, lng } = result.geometry.location;

  return {
    latitude: lat,
    longitude: lng,
    formattedAddress: result.formatted_address,
  };
}

export async function getDriveTime({ originLat, originLng, destLat, destLng }) {
  if ([originLat, originLng, destLat, destLng].some((value) => value == null)) {
    throw new Error('Origin and destination coordinates are required');
  }

  const key = getApiKey();
  const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
  url.searchParams.set('origins', `${originLat},${originLng}`);
  url.searchParams.set('destinations', `${destLat},${destLng}`);
  url.searchParams.set('mode', 'driving');
  url.searchParams.set('units', 'imperial');
  url.searchParams.set('key', key);

  const data = await mapsRequest(url);

  const element = data.rows?.[0]?.elements?.[0];
  if (!element) {
    throw new Error('Drive time lookup returned no results');
  }

  if (element.status === 'ZERO_RESULTS') {
    throw new Error('No driving route found between home and destination');
  }

  if (element.status !== 'OK') {
    throw new Error(`Drive time lookup failed (${element.status})`);
  }

  const driveTimeMinutes = Math.round(element.duration.value / 60);
  const driveDistanceMiles = Math.round((element.distance.value / 1609.34) * 10) / 10;

  return {
    driveTimeMinutes,
    driveDistanceMiles,
    durationText: element.duration.text,
    distanceText: element.distance.text,
  };
}

export function isMapsConfigured() {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY?.trim());
}

/**
 * Decode Google's encoded polyline (used by Directions API).
 */
export function decodePolyline(encoded) {
  const coordinates = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += deltaLat;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += deltaLng;

    coordinates.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return coordinates;
}

export async function getDrivingRoute({ originLat, originLng, destLat, destLng }) {
  if ([originLat, originLng, destLat, destLng].some((value) => value == null)) {
    throw new Error('Origin and destination coordinates are required');
  }

  const key = getApiKey();
  const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
  url.searchParams.set('origin', `${originLat},${originLng}`);
  url.searchParams.set('destination', `${destLat},${destLng}`);
  url.searchParams.set('mode', 'driving');
  url.searchParams.set('key', key);

  const data = await mapsRequest(url);

  if (data.status === 'ZERO_RESULTS') {
    throw new Error('No driving route found');
  }

  if (data.status !== 'OK' || !data.routes?.length) {
    throw new Error(`Directions lookup failed (${data.status})`);
  }

  const route = data.routes[0];
  const leg = route.legs?.[0];
  const encoded = route.overview_polyline?.points;

  if (!encoded) {
    throw new Error('Directions response missing route geometry');
  }

  return {
    points: decodePolyline(encoded),
    durationText: leg?.duration?.text ?? null,
    distanceText: leg?.distance?.text ?? null,
    driveTimeMinutes: leg?.duration?.value ? Math.round(leg.duration.value / 60) : null,
    driveDistanceMiles: leg?.distance?.value
      ? Math.round((leg.distance.value / 1609.34) * 10) / 10
      : null,
  };
}
