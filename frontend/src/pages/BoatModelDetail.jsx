import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSearchAPI, searchPath, useSearchId } from '../hooks/useSearch';
import ClickableCard from '../components/ClickableCard';
import ConfirmModal from '../components/ConfirmModal';
import InlineEditable from '../components/InlineEditable';
import EditableLineList from '../components/EditableLineList';
import SailboatDataImport, { mergeSailboatDataIntoModel } from '../components/SailboatDataImport';
import BoatModelSpecs, { boatModelHasSpecs } from '../components/BoatModelSpecs';
import InfoTooltip from '../components/InfoTooltip';
import useSearchAccess from '../hooks/useSearchAccess';
import { formatCurrency, statusLabel, LISTING_STATUSES } from '../lib/format';
import { formatBoatTitle } from '../lib/boatTitle';
import { showError, showSuccess } from '../lib/toast';
import { parseLineList } from '../lib/assetTypes';
import { buildBoatModelHighlights } from '../lib/boatModelSpecs';

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" aria-hidden="true">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}

function NotesEditor({ entity, canEdit, onSave }) {
  const pros = parseLineList(entity.pros);
  const cons = parseLineList(entity.cons);
  const empty = !entity.description && pros.length === 0 && cons.length === 0 && !entity.notes;

  if (canEdit) {
    return (
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-pine-800">Description</p>
          <InlineEditable
            value={entity.description}
            canEdit
            multiline
            placeholder="Short overview…"
            ariaLabel="Description"
            displayClassName="block w-full whitespace-pre-wrap text-sm text-pine-700"
            emptyClassName="block w-full text-sm text-pine-400"
            className="w-full"
            onSave={(description) => onSave({ description })}
          />
        </div>
        <EditableLineList
          label="Pros"
          value={entity.pros || ''}
          onChange={(prosValue) => onSave({ pros: prosValue })}
          placeholder="What you like…"
        />
        <EditableLineList
          label="Cons"
          value={entity.cons || ''}
          onChange={(consValue) => onSave({ cons: consValue })}
          placeholder="Tradeoffs…"
        />
        <div>
          <p className="mb-2 text-sm font-medium text-pine-800">Notes</p>
          <InlineEditable
            value={entity.notes}
            canEdit
            multiline
            placeholder="Extra notes…"
            ariaLabel="Notes"
            displayClassName="block w-full whitespace-pre-wrap text-sm text-pine-700"
            emptyClassName="block w-full text-sm text-pine-400"
            className="w-full"
            onSave={(notes) => onSave({ notes })}
          />
        </div>
      </div>
    );
  }

  if (empty) {
    return <p className="text-sm text-pine-500">No notes yet.</p>;
  }

  return (
    <div className="space-y-4">
      {entity.description && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-pine-700">{entity.description}</p>
      )}
      {pros.length > 0 && (
        <ul className="space-y-2">
          {pros.map((item) => (
            <li key={`p-${item}`} className="flex gap-2 text-sm text-pine-800">
              <CheckIcon />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
      {cons.length > 0 && (
        <ul className="space-y-2">
          {cons.map((item) => (
            <li key={`c-${item}`} className="flex gap-2 text-sm text-pine-800">
              <XIcon />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
      {entity.notes && (
        <p className="whitespace-pre-wrap rounded-lg bg-pine-50/80 px-3 py-2 text-sm text-pine-700">{entity.notes}</p>
      )}
    </div>
  );
}

export default function BoatModelDetail() {
  const { makeId, modelId } = useParams();
  const searchId = useSearchId();
  const api = useSearchAPI();
  const navigate = useNavigate();
  const { canEdit } = useSearchAccess();
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const load = async () => {
    const data = await api.boatModels.get(modelId);
    setModel(data.model);
  };

  useEffect(() => {
    const run = async () => {
      try {
        await load();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [modelId, api]);

  const applyUpdate = async (partial) => {
    try {
      const data = await api.boatModels.update(modelId, partial);
      setModel((current) => ({ ...current, ...data.model }));
      return data.model;
    } catch (err) {
      showError(err.message);
      throw err;
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await api.boatModels.remove(modelId);
      navigate(searchPath(searchId, `/makes/${makeId}`));
    } catch (err) {
      setError(err.message);
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <p className="text-pine-600">Loading model...</p>;
  }

  if (!model) {
    return <p className="text-pine-600">{error || 'Model not found'}</p>;
  }

  const makePros = parseLineList(model.make?.pros);
  const makeCons = parseLineList(model.make?.cons);
  const makeHasNotes = Boolean(
    model.make?.description || makePros.length || makeCons.length || model.make?.notes,
  );
  const highlights = buildBoatModelHighlights(model);
  const summary = [model.rigType, model.hullType].filter(Boolean).join(' · ');
  const builtLine = [
    model.firstBuilt && model.lastBuilt
      ? `${model.firstBuilt}–${model.lastBuilt}`
      : model.firstBuilt || model.lastBuilt,
    model.builtCount != null ? `${model.builtCount.toLocaleString()} built` : null,
    model.designer,
  ].filter(Boolean).join(' · ');

  return (
    <div className="pb-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          to={searchPath(searchId, `/makes/${makeId}`)}
          className="text-sm text-pine-600 transition-colors hover:text-pine-900"
        >
          ← {model.make?.name || 'Make'}
        </Link>

        {canEdit && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded-full border border-pine-200 bg-white px-3 py-1.5 text-sm text-pine-700 shadow-sm hover:bg-pine-50"
              aria-label="More actions"
            >
              ···
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10 cursor-default"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-pine-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <section className="relative overflow-hidden rounded-2xl border border-pine-200 bg-gradient-to-br from-white via-pine-50/40 to-sky-50/50 p-5 shadow-sm sm:p-7">
        <p className="text-sm text-pine-600">{model.make?.name}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pine-950 sm:text-3xl">
          <InlineEditable
            value={model.name}
            canEdit={canEdit}
            placeholder="Model name"
            ariaLabel="Model name"
            displayClassName="font-semibold text-pine-950"
            emptyClassName="font-semibold text-pine-400"
            onSave={async (name) => {
              if (!name?.trim()) {
                showError('Name is required');
                throw new Error('Name is required');
              }
              await applyUpdate({ name: name.trim() });
            }}
          />
        </h1>
        {summary && <p className="mt-2 text-sm text-pine-700 sm:text-base">{summary}</p>}
        {builtLine && <p className="mt-1 text-sm text-pine-500">{builtLine}</p>}

        {highlights.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-pine-200/80 pt-5 sm:grid-cols-4">
            {highlights.map((item) => (
              <div key={item.id || item.label}>
                <p className="inline-flex items-center text-xs text-pine-500">
                  <span>{item.label}</span>
                  {item.tip && <InfoTooltip tip={item.tip} label={item.label} />}
                </p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-pine-950 sm:text-xl">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {canEdit && (
        <div className="mt-6">
          <SailboatDataImport
            defaultUrl={model.sailboatDataUrl || ''}
            onImport={async (fields) => {
              const patch = mergeSailboatDataIntoModel(model, fields);
              if (Object.keys(patch).length === 0) {
                showError('Nothing new to import.');
                return;
              }
              setModel((current) => ({ ...current, ...patch }));
              await applyUpdate(patch);
              showSuccess('Imported from Sailboatdata.');
            }}
          />
        </div>
      )}

      {boatModelHasSpecs(model) && (
        <section className="mt-8">
          <BoatModelSpecs
            model={model}
            title="Full specs"
            showSummary={false}
            showHighlights={false}
          />
        </section>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-pine-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-pine-950">Your notes</h2>
          <NotesEditor
            entity={model}
            canEdit={canEdit}
            onSave={(partial) => {
              setModel((current) => ({ ...current, ...partial }));
              return applyUpdate(partial);
            }}
          />
        </section>

        {model.make && makeHasNotes && (
          <section className="rounded-2xl border border-pine-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-pine-950">{model.make.name}</h2>
              <Link
                to={searchPath(searchId, `/makes/${makeId}`)}
                className="text-sm font-medium text-pine-700 hover:text-pine-950"
              >
                View make →
              </Link>
            </div>
            <NotesEditor entity={model.make} canEdit={false} onSave={() => {}} />
          </section>
        )}
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-pine-950">Boats of this model</h2>
        {(model.listings || []).length === 0 ? (
          <p className="mt-3 text-sm text-pine-600">No boats linked yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-pine-100 rounded-2xl border border-pine-200 bg-white shadow-sm">
            {model.listings.map((listing) => (
              <ClickableCard
                key={listing.id}
                to={searchPath(searchId, `/listings/${listing.id}`)}
                className="!rounded-none !border-0 !shadow-none !p-4 first:!rounded-t-2xl last:!rounded-b-2xl"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-pine-900">{formatBoatTitle(listing)}</p>
                    <p className="text-sm text-pine-600">
                      {statusLabel(listing.status, LISTING_STATUSES)}
                    </p>
                  </div>
                  <p className="font-semibold tabular-nums text-pine-900">
                    {formatCurrency(listing.listPrice)}
                  </p>
                </div>
              </ClickableCard>
            ))}
          </div>
        )}
      </section>

      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete model"
          message="Delete this model? Boats stay, but model notes will no longer cascade."
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          loading={deleting}
          loadingLabel="Deleting..."
        />
      )}
    </div>
  );
}
