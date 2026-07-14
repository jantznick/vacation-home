import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSearchAPI, searchPath, useSearchId } from '../hooks/useSearch';
import useSearchAccess from '../hooks/useSearchAccess';
import Card from '../components/Card';
import Button from '../components/Button';
import PageHeader from '../components/PageHeader';
import ConfirmModal from '../components/ConfirmModal';
import Comments from '../components/Comments';
import { formatCurrency } from '../lib/format';
import { parseLineList } from '../lib/assetTypes';
import { formatBoatTitle } from '../lib/boatTitle';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function seasonDisplay(marina) {
  if (marina.yearRound) return 'Year-round';
  const open = marina.seasonOpen ? MONTH_NAMES[marina.seasonOpen - 1] : '?';
  const close = marina.seasonClose ? MONTH_NAMES[marina.seasonClose - 1] : '?';
  return `${open} – ${close}`;
}

function slipAnnualCost(opt, boatLengthFt) {
  if (opt.feeAmount == null) return null;
  const amount = Number(opt.feeAmount);
  const ft = boatLengthFt || 36;
  const base = opt.feeType === 'per_ft' ? amount * ft : amount;
  if (opt.feePeriod === 'annual') return Math.round(base);
  if (opt.feePeriod === 'seasonal') return Math.round(base);
  return Math.round(base * 12);
}

function formatSlipRate(opt) {
  if (opt.feeAmount == null) return '—';
  const amt = formatCurrency(Number(opt.feeAmount));
  const suffix = opt.feeType === 'per_ft' ? '/ft' : '';
  const period = { monthly: '/mo', seasonal: '/season', annual: '/yr' }[opt.feePeriod] || '';
  return `${amt}${suffix}${period}`;
}

function CostRow({ label, value }) {
  if (value == null) return null;
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-pine-600">{label}</span>
      <span className="font-medium tabular-nums text-pine-900">{formatCurrency(value)}</span>
    </div>
  );
}

function DetailRow({ label, value }) {
  if (value == null && value !== false) return null;
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value;
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-pine-600">{label}</span>
      <span className="text-pine-900">{display}</span>
    </div>
  );
}

export default function MarinaDetail() {
  const { id } = useParams();
  const searchId = useSearchId();
  const api = useSearchAPI();
  const navigate = useNavigate();
  const { canEdit } = useSearchAccess();
  const [marina, setMarina] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.marinas.get(id);
        setMarina(data.marina);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, api]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.marinas.remove(id);
      navigate(searchPath(searchId, '/marinas'));
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  };

  if (loading) return <p className="text-pine-600">Loading marina...</p>;
  if (error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  if (!marina) return null;

  const pros = parseLineList(marina.pros);
  const cons = parseLineList(marina.cons);
  const slips = Array.isArray(marina.slipOptions) ? marina.slipOptions : [];

  return (
    <div>
      <PageHeader
        title={marina.name}
        description={[marina.city, marina.state].filter(Boolean).join(', ') || null}
        actions={canEdit ? (
          <>
            <Link to={searchPath(searchId, `/marinas/${id}/edit`)}>
              <Button variant="secondary">Edit</Button>
            </Link>
            <Button variant="danger" onClick={() => setShowDelete(true)}>Delete</Button>
          </>
        ) : undefined}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Carrying costs */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-pine-800">Carrying costs</h3>

            {slips.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-pine-600">Slip options</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-pine-200 text-xs text-pine-500">
                        <th className="py-1.5 pr-3 text-left font-medium">Option</th>
                        <th className="px-3 py-1.5 text-right font-medium">Rate</th>
                        <th className="px-3 py-1.5 text-right font-medium">Annual (36')</th>
                        <th className="px-3 py-1.5 text-right font-medium">Max LOA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slips.map((opt, i) => (
                        <tr key={i} className="border-t border-pine-100">
                          <td className="py-1.5 pr-3 text-pine-900">
                            {opt.name}
                            {opt.notes && <span className="ml-1 text-xs text-pine-400">({opt.notes})</span>}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums font-medium text-pine-900">
                            {formatSlipRate(opt)}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-pine-600">
                            {slipAnnualCost(opt, 36) != null ? formatCurrency(slipAnnualCost(opt, 36)) : '—'}
                          </td>
                          <td className="px-3 py-1.5 text-right text-pine-600">
                            {opt.maxLengthFt ? `${opt.maxLengthFt}'` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="divide-y divide-pine-100">
              <CostRow label="Winter storage" value={marina.winterStorageCost} />
            </div>
          </Card>

          {/* Details */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-pine-800">Details</h3>
            <div className="divide-y divide-pine-100">
              <DetailRow label="Season" value={seasonDisplay(marina)} />
              {marina.maxLengthFt != null && <DetailRow label="Max LOA" value={`${marina.maxLengthFt} ft`} />}
              {marina.maxDraftFt != null && <DetailRow label="Max draft" value={`${marina.maxDraftFt} ft`} />}
              <DetailRow label="Liveaboard" value={marina.liveaboardAllowed} />
              {marina.website && (
                <div className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-pine-600">Website</span>
                  <a href={marina.website} target="_blank" rel="noreferrer" className="text-pine-900 underline hover:text-pine-700">
                    {new URL(marina.website).hostname}
                  </a>
                </div>
              )}
            </div>
            {marina.amenities && (
              <div className="mt-4 border-t border-pine-100 pt-3">
                <p className="text-xs font-medium text-pine-600">Amenities</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-pine-800">{marina.amenities}</p>
              </div>
            )}
          </Card>

          {/* Pros / cons / notes */}
          {(pros.length > 0 || cons.length > 0 || marina.description || marina.notes) && (
            <Card>
              {marina.description && (
                <p className="mb-4 whitespace-pre-wrap text-sm text-pine-700">{marina.description}</p>
              )}
              {pros.length > 0 && (
                <div className="mb-3">
                  <p className="mb-1 text-xs font-medium text-pine-600">Pros</p>
                  <ul className="space-y-1">
                    {pros.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-pine-800">
                        <span className="shrink-0 text-emerald-600">✓</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {cons.length > 0 && (
                <div className="mb-3">
                  <p className="mb-1 text-xs font-medium text-pine-600">Cons</p>
                  <ul className="space-y-1">
                    {cons.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-pine-800">
                        <span className="shrink-0 text-rose-500">✗</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {marina.notes && (
                <div className="mt-3 border-t border-pine-100 pt-3">
                  <p className="text-xs font-medium text-pine-600">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-pine-700">{marina.notes}</p>
                </div>
              )}
            </Card>
          )}

          {/* Linked boats */}
          {marina.listings?.length > 0 && (
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-pine-800">
                Boats at this marina ({marina.listings.length})
              </h3>
              <ul className="divide-y divide-pine-100">
                {marina.listings.map((listing) => (
                  <li key={listing.id} className="py-2">
                    <Link
                      to={searchPath(searchId, `/listings/${listing.id}`)}
                      className="flex items-center justify-between text-sm hover:text-pine-700"
                    >
                      <span className="font-medium text-pine-900">
                        {formatBoatTitle(listing)}
                      </span>
                      {listing.listPrice != null && (
                        <span className="tabular-nums text-pine-600">
                          {formatCurrency(listing.listPrice)}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {marina.overallScore != null && (
            <Card>
              <p className="text-xs font-medium text-pine-600">Overall score</p>
              <p className="mt-1 text-3xl font-bold text-pine-900">{marina.overallScore}<span className="text-lg text-pine-400">/10</span></p>
            </Card>
          )}

          <Comments targetType="marina" targetId={marina.id} />
        </div>
      </div>

      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete marina"
        message={`Delete "${marina.name}"? Boats linked to this marina will be unlinked but not deleted.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        variant="danger"
      />
    </div>
  );
}
