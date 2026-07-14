/** Shared boat listing title helpers. */

export function boatMakeModelLabel(listing) {
  return [listing?.make, listing?.model].filter(Boolean).join(' ');
}

/**
 * Nickname first when present — e.g. "Sea Breeze · Catalina 30".
 */
export function formatBoatTitle(listing) {
  const name = boatMakeModelLabel(listing);
  const nickname = listing?.nickname?.trim?.() ? listing.nickname.trim() : null;

  if (nickname && name) {
    return `${nickname} · ${name}`;
  }
  if (nickname) return nickname;
  if (name) return name;
  if (listing?.lengthFt) return `${listing.lengthFt} ft boat`;
  return listing?.address || 'Untitled boat';
}

/** Primary display name: nickname preferred over make/model. */
export function boatDisplayName(listing) {
  const nickname = listing?.nickname?.trim?.() ? listing.nickname.trim() : null;
  if (nickname) return nickname;
  return boatMakeModelLabel(listing)
    || (listing?.lengthFt ? `${listing.lengthFt} ft boat` : null)
    || listing?.address
    || 'Untitled boat';
}
