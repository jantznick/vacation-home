import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSearchAPI, searchPath, useSearchId } from '../hooks/useSearch';
import Card from '../components/Card';
import ClickableCard from '../components/ClickableCard';
import Button from '../components/Button';
import ConfirmModal from '../components/ConfirmModal';
import InlineEditable from '../components/InlineEditable';
import EditableLineList from '../components/EditableLineList';
import useSearchAccess from '../hooks/useSearchAccess';
import { formatCurrency, statusLabel, LISTING_STATUSES } from '../lib/format';
import { formatBoatTitle } from '../lib/boatTitle';
import { showError } from '../lib/toast';
import { parseLineList } from '../lib/assetTypes';

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

export default function BoatMakeDetail() {
  const { id } = useParams();
  const searchId = useSearchId();
  const api = useSearchAPI();
  const navigate = useNavigate();
  const { canEdit } = useSearchAccess();
  const [make, setMake] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modelName, setModelName] = useState('');
  const [savingModel, setSavingModel] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const load = async () => {
    const data = await api.boatMakes.get(id);
    setMake(data.make);
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
  }, [id, api]);

  const applyUpdate = async (partial) => {
    try {
      const data = await api.boatMakes.update(id, partial);
      setMake((current) => ({ ...current, ...data.make }));
      return data.make;
    } catch (err) {
      showError(err.message);
      throw err;
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await api.boatMakes.remove(id);
      navigate(searchPath(searchId, '/makes'));
    } catch (err) {
      setError(err.message);
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleAddModel = async (event) => {
    event.preventDefault();
    if (!modelName.trim()) return;
    setSavingModel(true);
    setError('');
    try {
      const data = await api.boatMakes.createModel(id, { name: modelName.trim() });
      setModelName('');
      await load();
      navigate(searchPath(searchId, `/makes/${id}/models/${data.model.id}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingModel(false);
    }
  };

  if (loading) {
    return <p className="text-pine-600">Loading make...</p>;
  }

  if (!make) {
    return <p className="text-pine-600">{error || 'Make not found'}</p>;
  }

  return (
    <div className="pb-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          to={searchPath(searchId, '/makes')}
          className="text-sm text-pine-600 transition-colors hover:text-pine-900"
        >
          ← Makes
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

      <section className="relative overflow-hidden rounded-2xl border border-pine-200 bg-gradient-to-br from-white via-pine-50/40 to-sky-50/50 p-5 shadow-sm sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-pine-950 sm:text-3xl">
          <InlineEditable
            value={make.name}
            canEdit={canEdit}
            placeholder="Make name"
            ariaLabel="Make name"
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
        <p className="mt-1 text-sm text-pine-600">Builder notes cascade onto every boat of this make.</p>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <NotesEditor
            entity={make}
            canEdit={canEdit}
            onSave={(partial) => {
              setMake((current) => ({ ...current, ...partial }));
              return applyUpdate(partial);
            }}
          />
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium text-pine-900">Models</h2>
            <span className="text-sm text-pine-600">{make.models?.length || 0}</span>
          </div>

          {canEdit && (
            <form onSubmit={handleAddModel} className="mt-4 flex gap-2">
              <input
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="Add a model (e.g. 30)"
                className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm"
              />
              <Button type="submit" disabled={savingModel || !modelName.trim()}>
                Add
              </Button>
            </form>
          )}

          <div className="mt-4 space-y-2">
            {(make.models || []).length === 0 ? (
              <p className="text-sm text-pine-600">No models yet.</p>
            ) : (
              make.models.map((model) => (
                <ClickableCard
                  key={model.id}
                  to={searchPath(searchId, `/makes/${id}/models/${model.id}`)}
                  className="!p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-pine-900">{model.name}</p>
                    <span className="text-sm text-pine-600">
                      {model._count?.listings ?? 0} boats
                    </span>
                  </div>
                </ClickableCard>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="text-lg font-medium text-pine-900">Boats</h2>
        {(make.listings || []).length === 0 ? (
          <p className="mt-3 text-sm text-pine-600">No boats linked to this make yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {make.listings.map((listing) => (
              <ClickableCard
                key={listing.id}
                to={searchPath(searchId, `/listings/${listing.id}`)}
                className="!p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-pine-900">{formatBoatTitle(listing)}</p>
                    <p className="text-sm text-pine-600">
                      {statusLabel(listing.status, LISTING_STATUSES)}
                      {listing.boatModel?.name ? ` · ${listing.boatModel.name}` : ''}
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
      </Card>

      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete make"
          message="Delete this make and its models? Boats stay, but make/model notes will no longer cascade."
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          loading={deleting}
          loadingLabel="Deleting..."
        />
      )}
    </div>
  );
}
