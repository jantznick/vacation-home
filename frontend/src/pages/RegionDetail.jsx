import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSearchAPI, searchPath, useSearchId } from '../hooks/useSearch';
import Card from '../components/Card';
import ClickableCard from '../components/ClickableCard';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import ConfirmModal from '../components/ConfirmModal';
import IconButton from '../components/IconButton';
import LakeEditModal from '../components/LakeEditModal';
import LakeFormFields from '../components/LakeFormFields';
import DnrLakeImport, { mergeDnrIntoLakeForm } from '../components/DnrLakeImport';
import RouteMap from '../components/RouteMap';
import Comments from '../components/Comments';
import {
  formatCurrency,
  formatDriveTime,
  formatNumber,
  statusLabel,
  REGION_STATUSES,
  LISTING_STATUSES,
} from '../lib/format';
import usePrimaryPoi from '../hooks/usePrimaryPoi';
import useSearchAccess from '../hooks/useSearchAccess';
import ListingPrimaryDriveTime from '../components/ListingPrimaryDriveTime';
import {
  emptyLakeForm,
  formValuesToLakePayload,
} from '../lib/lakeForm';

const PencilIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className="h-5 w-5"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"
    />
  </svg>
);

const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className="h-5 w-5"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
    />
  </svg>
);

export default function RegionDetail() {
  const { id } = useParams();
  const searchId = useSearchId();
  const api = useSearchAPI();
  const navigate = useNavigate();
  const { canEdit } = useSearchAccess();
  const [region, setRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lakeForm, setLakeForm] = useState(emptyLakeForm);
  const [showLakeForm, setShowLakeForm] = useState(false);
  const [savingLake, setSavingLake] = useState(false);
  const [dnrImportUrl, setDnrImportUrl] = useState('');
  const [dnrImportWarnings, setDnrImportWarnings] = useState([]);
  const [lakeToDelete, setLakeToDelete] = useState(null);
  const [deletingLake, setDeletingLake] = useState(false);
  const [lakeToEdit, setLakeToEdit] = useState(null);
  const [showDeleteRegionConfirm, setShowDeleteRegionConfirm] = useState(false);
  const [deletingRegion, setDeletingRegion] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [calculatingDriveTime, setCalculatingDriveTime] = useState(false);
  const { label: primaryPoiLabel } = usePrimaryPoi();
  const originLabel = primaryPoiLabel || 'your primary location';

  const loadRegion = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.regions.get(id);
      setRegion(data.region);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadRegion();
  }, [id, api]);

  const handleDeleteRegion = async () => {
    setDeletingRegion(true);
    setError('');

    try {
      await api.regions.remove(id);
      navigate(searchPath(searchId, '/regions'));
    } catch (err) {
      setError(err.message);
      setShowDeleteRegionConfirm(false);
    } finally {
      setDeletingRegion(false);
    }
  };

  const applyDnrPreview = (fields) => {
    setLakeForm((current) => mergeDnrIntoLakeForm(current, fields));
  };

  const handleDnrImport = (fields, warnings) => {
    applyDnrPreview(fields);
    setDnrImportWarnings(warnings);
    setShowLakeForm(true);
  };

  const handleLakeSubmit = async (event) => {
    event.preventDefault();
    setSavingLake(true);
    setError('');

    try {
      await api.lakes.create({
        regionId: id,
        ...formValuesToLakePayload(lakeForm),
      });
      setLakeForm(emptyLakeForm);
      setShowLakeForm(false);
      await loadRegion();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingLake(false);
    }
  };

  const handleDeleteLake = async () => {
    if (!lakeToDelete) return;

    setDeletingLake(true);
    setError('');

    try {
      await api.lakes.remove(lakeToDelete.id);
      setLakeToDelete(null);
      await loadRegion();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingLake(false);
    }
  };

  const handleGeocodeRegion = async () => {
    setGeocoding(true);
    setLocationError('');

    try {
      const data = await api.regions.geocode(id);
      setRegion((current) => ({
        ...current,
        ...data.region,
      }));
    } catch (err) {
      setLocationError(err.message);
    } finally {
      setGeocoding(false);
    }
  };

  const handleRegionDriveTime = async () => {
    setCalculatingDriveTime(true);
    setLocationError('');

    try {
      const data = await api.regions.driveTime(id);
      setRegion(data.region);
    } catch (err) {
      setLocationError(err.message);
    } finally {
      setCalculatingDriveTime(false);
    }
  };

  if (loading) {
    return <p className="text-pine-600">Loading region...</p>;
  }

  if (!region) {
    return <p className="text-red-700">{error || 'Region not found'}</p>;
  }

  const regionAddressLine = region.centerAddress || region.name;

  return (
    <div>
      <PageHeader
        title={region.name}
        description={region.description}
        actions={canEdit ? (
          <>
            <Link to={searchPath(searchId, `/regions/${id}/edit`)}>
              <Button variant="secondary">Edit</Button>
            </Link>
            <Link to={searchPath(searchId, `/listings/new?regionId=${id}`)}>
              <Button>Add listing</Button>
            </Link>
            <Button variant="danger" onClick={() => setShowDeleteRegionConfirm(true)}>
              Delete
            </Button>
          </>
        ) : undefined}
      />

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="text-lg font-medium text-pine-900">Overview</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-pine-500">Status</dt>
                <dd className="text-sm text-pine-900">{statusLabel(region.status, REGION_STATUSES)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-pine-500">Overall score</dt>
                <dd className="text-sm text-pine-900">{region.overallScore ?? '—'}</dd>
              </div>
            </dl>

            <div className="mt-4 border-t border-pine-100 pt-4 text-sm">
              <p className="text-pine-900">{regionAddressLine}</p>
              {region.radiusMiles != null && region.radiusMiles > 0 && (
                <p className="mt-0.5 text-pine-600">{formatNumber(region.radiusMiles, ' mi')} search radius</p>
              )}
              {region.driveTimeMinutes != null ? (
                <p className="mt-1 text-pine-600">
                  {formatDriveTime(region.driveTimeMinutes)}
                  {region.driveDistanceMiles != null && (
                    <> · {formatNumber(region.driveDistanceMiles, ' mi')}</>
                  )}
                  {' '}from {originLabel}
                </p>
              ) : (
                <p className="mt-1 text-pine-500">Drive time not calculated yet</p>
              )}
              {!region.latitude && (
                <p className="mt-1 text-pine-500">Map pin not set</p>
              )}
              {locationError && (
                <p className="mt-2 text-sm text-red-700">{locationError}</p>
              )}
              {canEdit && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {!region.latitude && (
                    <Button
                      variant="secondary"
                      className="min-h-9 px-3 py-1.5"
                      onClick={handleGeocodeRegion}
                      disabled={geocoding}
                    >
                      {geocoding ? 'Looking up…' : 'Look up pin'}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    className="min-h-9 px-3 py-1.5"
                    onClick={handleRegionDriveTime}
                    disabled={calculatingDriveTime}
                  >
                    {calculatingDriveTime ? 'Calculating…' : 'Refresh drive time'}
                  </Button>
                </div>
              )}
            </div>

            {region.latitude != null && region.longitude != null && (
              <div className="mt-4">
                <RouteMap
                  key={`${region.id}-${region.latitude}-${region.longitude}`}
                  destination={region}
                  destinationType="region"
                  destinationLabel={region.name}
                  destinationSublabel={regionAddressLine}
                  destinationHref={searchPath(searchId, `/regions/${region.id}`)}
                  radiusMiles={region.radiusMiles}
                />
              </div>
            )}

            {region.pros && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-pine-800">Pros</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-pine-700">{region.pros}</p>
              </div>
            )}
            {region.cons && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-pine-800">Cons</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-pine-700">{region.cons}</p>
              </div>
            )}
            {region.notes && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-pine-800">Notes</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-pine-700">{region.notes}</p>
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-medium text-pine-900">Lakes</h2>
              {canEdit && (
                <Button variant="secondary" onClick={() => setShowLakeForm((value) => !value)}>
                  {showLakeForm ? 'Cancel' : 'Add lake'}
                </Button>
              )}
            </div>

            {canEdit && showLakeForm && (
              <form onSubmit={handleLakeSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
                <DnrLakeImport
                  url={dnrImportUrl}
                  onUrlChange={setDnrImportUrl}
                  onImport={(fields, warnings) => {
                    handleDnrImport(fields, warnings);
                  }}
                  warnings={dnrImportWarnings}
                />

                <LakeFormFields values={lakeForm} onChange={setLakeForm} idPrefix="new-lake" />

                <div className="sm:col-span-2">
                  <Button type="submit" disabled={savingLake}>
                    {savingLake ? 'Saving...' : 'Save lake'}
                  </Button>
                </div>
              </form>
            )}

            {region.lakes.length === 0 ? (
              <p className="mt-4 text-sm text-pine-600">No lakes recorded yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {region.lakes.map((lake) => (
                  <li key={lake.id} className="flex items-start justify-between gap-3 rounded-lg border border-pine-200 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-pine-900">{lake.name}</p>
                      <p className="mt-1 text-sm text-pine-600">
                        {lake.acreage ? `${lake.acreage} acres` : 'Acreage unknown'}
                        {lake.maxDepthFeet ? ` · max ${lake.maxDepthFeet} ft` : ''}
                      </p>
                      {(lake.waterClarity || lake.edgeType) && (
                        <p className="mt-1 text-sm text-pine-600">
                          {[lake.waterClarity, lake.edgeType].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex shrink-0 items-center gap-1">
                        <IconButton
                          label={`Edit ${lake.name}`}
                          onClick={() => setLakeToEdit(lake)}
                        >
                          <PencilIcon />
                        </IconButton>
                        <IconButton
                          label={`Delete ${lake.name}`}
                          variant="danger"
                          onClick={() => setLakeToDelete({ id: lake.id, name: lake.name })}
                        >
                          <TrashIcon />
                        </IconButton>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-medium text-pine-900">Listings in this region</h2>
            {region.listings.length === 0 ? (
              <p className="mt-4 text-sm text-pine-600">No listings yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {region.listings.map((listing) => (
                  <ClickableCard key={listing.id} to={searchPath(searchId, `/listings/${listing.id}`)}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-medium text-pine-900">
                          {listing.address || 'Untitled listing'}
                        </p>
                        {listing.lake && (
                          <p className="mt-1 text-sm text-pine-600">{listing.lake.name}</p>
                        )}
                        <p className="mt-1 text-xs text-pine-500">
                          {statusLabel(listing.status, LISTING_STATUSES)} · {listing.isVacantLot ? 'Vacant lot' : 'With home'}
                          {listing.waterfront ? ' · Waterfront' : ''}
                        </p>
                        <ListingPrimaryDriveTime
                          minutes={listing.driveTimeMinutes}
                          poiLabel={originLabel}
                          className="mt-1 text-xs text-pine-500"
                        />
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-pine-900">
                          {formatCurrency(listing.listPrice)}
                        </p>
                        {listing.acres && (
                          <p className="text-sm text-pine-600">
                            {listing.acres} acres
                            {listing.pricePerAcre ? ` · ${formatCurrency(listing.pricePerAcre)}/acre` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </ClickableCard>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="h-fit">
          <Comments targetType="region" targetId={region.id} />
        </Card>
      </div>

      {lakeToEdit && (
        <LakeEditModal
          lake={lakeToEdit}
          onClose={() => setLakeToEdit(null)}
          onSaved={() => loadRegion({ silent: true })}
        />
      )}

      {lakeToDelete && (
        <ConfirmModal
          title="Delete lake"
          message={`Are you sure you want to delete ${lakeToDelete.name}? Listings linked to this lake will be kept but unassigned.`}
          onConfirm={handleDeleteLake}
          onCancel={() => setLakeToDelete(null)}
          loading={deletingLake}
          loadingLabel="Deleting..."
        />
      )}

      {showDeleteRegionConfirm && (
        <ConfirmModal
          title="Delete region"
          message="Are you sure you want to delete this region and all its lakes and listings?"
          onConfirm={handleDeleteRegion}
          onCancel={() => setShowDeleteRegionConfirm(false)}
          loading={deletingRegion}
          loadingLabel="Deleting..."
        />
      )}
    </div>
  );
}
