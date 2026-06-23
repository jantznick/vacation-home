export function formatPoiAddress(poi) {
  if (!poi) return null;
  const parts = [poi.address, poi.city, poi.state, poi.zip].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

export function formatListingAddress(listing) {
  if (!listing) return null;
  const parts = [listing.address, listing.city, listing.state, listing.zip].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

export function formatRegionLocation(region) {
  if (!region) return null;
  if (region.centerAddress?.trim()) {
    return region.centerAddress.trim();
  }
  if (region.name?.trim()) {
    return `${region.name.trim()}, WI`;
  }
  return null;
}

export function hasCoordinates(entity) {
  return entity?.latitude != null && entity?.longitude != null;
}

export function googleMapsLink(latitude, longitude) {
  if (latitude == null || longitude == null) return null;
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

export function parseCoordinate(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}
