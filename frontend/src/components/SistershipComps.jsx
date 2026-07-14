import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { searchPath } from '../hooks/useSearch';
import { formatCurrency } from '../lib/format';
import { formatBoatTitle } from '../lib/boatTitle';
import ShortlistStar from './ShortlistStar';
import { showError } from '../lib/toast';

/**
 * Shows a "vs other tracked [Model Name]s" panel on a boat listing detail page.
 * Fetches all listings sharing the same boatModelId and displays a compact comparison.
 */
export default function SistershipComps({ listing, searchId, api, canEdit, onListingUpdate }) {
  const [sisterships, setSisterships] = useState([]);
  const [loading, setLoading] = useState(true);

  const modelId = listing?.boatModelId;
  const modelName = listing?.boatModel?.name || listing?.model;

  useEffect(() => {
    if (!modelId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const data = await api.listings.list({
          boatModelId: modelId,
          includeSold: 'true',
        });
        if (!cancelled) {
          setSisterships(data.listings.filter((l) => l.id !== listing.id));
        }
      } catch {
        // Silently fail — not critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [api, modelId, listing?.id]);

  if (!modelId || loading || sisterships.length === 0) return null;

  const toggleShortlist = async (ship) => {
    const next = !ship.shortlisted;
    try {
      await api.listings.update(ship.id, { shortlisted: next });
      setSisterships((prev) =>
        prev.map((s) => (s.id === ship.id ? { ...s, shortlisted: next } : s)),
      );
    } catch (err) {
      showError(err.message);
    }
  };

  const allIds = [listing.id, ...sisterships.map((s) => s.id)].join(',');
  const compareUrl = searchPath(searchId, `/compare?ids=${allIds}&boatModelId=${modelId}`);

  const allListings = [listing, ...sisterships];

  return (
    <section className="rounded-xl border border-pine-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-pine-100 px-4 py-3 sm:px-5">
        <h3 className="text-sm font-semibold text-pine-900">
          vs {sisterships.length} other tracked {modelName}{sisterships.length !== 1 ? 's' : ''}
        </h3>
        <Link
          to={compareUrl}
          className="inline-flex items-center rounded-lg border border-pine-300 bg-white px-3 py-1.5 text-xs font-medium text-pine-800 shadow-sm hover:bg-pine-50"
        >
          Compare all {sisterships.length + 1}
        </Link>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-pine-100 text-xs text-pine-500">
              <th className="px-4 py-2 text-left font-medium">Boat</th>
              <th className="px-3 py-2 text-right font-medium">Price</th>
              <th className="px-3 py-2 text-right font-medium">$/ft</th>
              <th className="px-3 py-2 text-right font-medium">Year</th>
              <th className="px-3 py-2 text-right font-medium">Draft</th>
              <th className="px-3 py-2 text-right font-medium">Eng hrs</th>
              <th className="px-3 py-2 text-center font-medium">Interest</th>
              <th className="px-3 py-2 text-center font-medium" />
            </tr>
          </thead>
          <tbody>
            <SisterRow
              listing={listing}
              searchId={searchId}
              canEdit={canEdit}
              isSelf
              onToggle={() => onListingUpdate?.({ shortlisted: !listing.shortlisted })}
            />
            {sisterships.map((ship) => (
              <SisterRow
                key={ship.id}
                listing={ship}
                searchId={searchId}
                canEdit={canEdit}
                onToggle={() => toggleShortlist(ship)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-pine-100 sm:hidden">
        {allListings.map((ship) => {
          const isSelf = ship.id === listing.id;
          const price = ship.isSoldComp ? (ship.soldPrice ?? ship.listPrice) : ship.listPrice;
          return (
            <div key={ship.id} className={`px-4 py-3 ${isSelf ? 'bg-pine-50/60' : ''}`}>
              <div className="flex items-center gap-2">
                <ShortlistStar
                  active={ship.shortlisted}
                  canEdit={canEdit}
                  onToggle={isSelf
                    ? () => onListingUpdate?.({ shortlisted: !ship.shortlisted })
                    : () => toggleShortlist(ship)
                  }
                />
                {isSelf ? (
                  <span className="text-sm font-medium text-pine-900">
                    {formatBoatTitle(ship)}
                    <span className="ml-1 text-xs text-pine-400">(this)</span>
                  </span>
                ) : (
                  <Link
                    to={searchPath(searchId, `/listings/${ship.id}`)}
                    className="text-sm font-medium text-pine-900 hover:text-pine-700"
                  >
                    {formatBoatTitle(ship)}
                  </Link>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs tabular-nums text-pine-600">
                <span className="font-medium text-pine-900">{formatCurrency(price)}</span>
                {ship.pricePerFoot && <span>{formatCurrency(ship.pricePerFoot)}/ft</span>}
                {ship.yearBuilt && <span>{ship.yearBuilt}</span>}
                {ship.draftFt != null && <span>{ship.draftFt}' draft</span>}
                {ship.engineHours != null && <span>{ship.engineHours.toLocaleString()} hrs</span>}
              </div>
              <div className="mt-1 text-amber-500 text-xs">
                {'★'.repeat(ship.interestLevel || 0)}
                <span className="text-pine-200">{'☆'.repeat(5 - (ship.interestLevel || 0))}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SisterRow({ listing, searchId, canEdit, isSelf, onToggle }) {
  const price = listing.isSoldComp
    ? (listing.soldPrice ?? listing.listPrice)
    : listing.listPrice;

  return (
    <tr className={`border-t border-pine-50 ${isSelf ? 'bg-pine-50/60' : 'hover:bg-pine-50/40'}`}>
      <td className="px-4 py-2 text-left">
        <div className="flex items-center gap-1.5">
          <ShortlistStar
            active={listing.shortlisted}
            canEdit={canEdit}
            onToggle={onToggle}
          />
          {isSelf ? (
            <span className="font-medium text-pine-900">
              {formatBoatTitle(listing)}
              <span className="ml-1 text-xs text-pine-400">(this listing)</span>
            </span>
          ) : (
            <Link
              to={searchPath(searchId, `/listings/${listing.id}`)}
              className="font-medium text-pine-900 hover:text-pine-700"
            >
              {formatBoatTitle(listing)}
            </Link>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-right tabular-nums font-medium">
        {formatCurrency(price)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-pine-600">
        {listing.pricePerFoot ? formatCurrency(listing.pricePerFoot) : '—'}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-pine-600">
        {listing.yearBuilt ?? '—'}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-pine-600">
        {listing.draftFt != null ? `${listing.draftFt}'` : '—'}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-pine-600">
        {listing.engineHours != null ? listing.engineHours.toLocaleString() : '—'}
      </td>
      <td className="px-3 py-2 text-center text-amber-500">
        {'★'.repeat(listing.interestLevel || 0)}
        <span className="text-pine-200">{'☆'.repeat(5 - (listing.interestLevel || 0))}</span>
      </td>
      <td className="px-3 py-2">
        {listing.cons && (
          <span className="text-xs text-rose-500" title={listing.cons}>⚠</span>
        )}
      </td>
    </tr>
  );
}
