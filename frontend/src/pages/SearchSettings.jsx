import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { searchesAPI } from '../api/api';
import { useSearchAPI, searchPath } from '../hooks/useSearch';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import FormField from '../components/FormField';
import ConfirmModal from '../components/ConfirmModal';
import EditableLineList from '../components/EditableLineList';
import CriteriaEditor from '../components/CriteriaEditor';
import { normalizeCriteriaList } from '../lib/searchCriteria';
import { AssetTypeBadge } from '../components/AssetTypeTabs';
import { showError, showInviteCreated, showSuccess } from '../lib/toast';
import useAuthStore from '../store/authStore';
import ZillowPasteImport from '../components/ZillowPasteImport';
import { isBoatSearch } from '../lib/assetTypes';

const MEMBER_ROLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

const POI_TYPES = [
  { value: 'current_home', label: 'Current home' },
  { value: 'work', label: 'Work' },
  { value: 'school', label: 'School' },
  { value: 'family', label: 'Family' },
  { value: 'other', label: 'Other' },
];

const emptyPoiForm = {
  type: 'current_home',
  label: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  isPrimary: false,
};

function poiToForm(poi) {
  return {
    type: poi.type,
    label: poi.label,
    address: poi.address || '',
    city: poi.city || '',
    state: poi.state || '',
    zip: poi.zip || '',
    isPrimary: poi.isPrimary,
  };
}

function PoiFormFields({ form, onChange, idPrefix = 'poi' }) {
  const isOther = form.type === 'other';

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Type" htmlFor={`${idPrefix}-type`}>
          <select
            id={`${idPrefix}-type`}
            value={form.type}
            onChange={(e) => onChange({ ...form, type: e.target.value })}
            className="w-full rounded-md border border-pine-200 px-3 py-2 text-sm"
          >
            {POI_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </FormField>
        <FormField label={isOther ? 'Name' : 'Label'} htmlFor={`${idPrefix}-label`}>
          <input
            id={`${idPrefix}-label`}
            value={form.label}
            onChange={(e) => onChange({ ...form, label: e.target.value })}
            placeholder={isOther ? "e.g. Gym, parents' house" : 'Home'}
            className="w-full rounded-md border border-pine-200 px-3 py-2 text-sm"
            required
          />
        </FormField>
      </div>
      {isOther && (
        <p className="text-xs text-pine-500">Give this location a name that makes sense to you.</p>
      )}
      <FormField label="Street address" htmlFor={`${idPrefix}-address`}>
        <input
          id={`${idPrefix}-address`}
          value={form.address}
          onChange={(e) => onChange({ ...form, address: e.target.value })}
          placeholder="123 Main St"
          className="w-full rounded-md border border-pine-200 px-3 py-2 text-sm"
        />
      </FormField>
      <div className="grid gap-3 sm:grid-cols-3">
        <FormField label="City" htmlFor={`${idPrefix}-city`}>
          <input
            id={`${idPrefix}-city`}
            value={form.city}
            onChange={(e) => onChange({ ...form, city: e.target.value })}
            placeholder="Chicago"
            className="w-full rounded-md border border-pine-200 px-3 py-2 text-sm"
          />
        </FormField>
        <FormField label="State" htmlFor={`${idPrefix}-state`}>
          <input
            id={`${idPrefix}-state`}
            value={form.state}
            onChange={(e) => onChange({ ...form, state: e.target.value })}
            placeholder="IL"
            maxLength={2}
            className="w-full rounded-md border border-pine-200 px-3 py-2 text-sm uppercase"
          />
        </FormField>
        <FormField label="ZIP" htmlFor={`${idPrefix}-zip`}>
          <input
            id={`${idPrefix}-zip`}
            value={form.zip}
            onChange={(e) => onChange({ ...form, zip: e.target.value })}
            placeholder="60601"
            className="w-full rounded-md border border-pine-200 px-3 py-2 text-sm"
          />
        </FormField>
      </div>
    </>
  );
}

export default function SearchSettings() {
  const { searchId } = useParams();
  const api = useSearchAPI();
  const { user } = useAuthStore();
  const [search, setSearch] = useState(null);
  const [pois, setPois] = useState([]);
  const [members, setMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [addForm, setAddForm] = useState(emptyPoiForm);
  const [editingPoiId, setEditingPoiId] = useState(null);
  const [editForm, setEditForm] = useState(emptyPoiForm);
  const [poiToDelete, setPoiToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteToCancel, setInviteToCancel] = useState(null);
  const [cancellingInviteId, setCancellingInviteId] = useState(null);
  const [resendingInviteId, setResendingInviteId] = useState(null);
  const [savingPoi, setSavingPoi] = useState(false);
  const [deletingPoi, setDeletingPoi] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState(null);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [detailsForm, setDetailsForm] = useState({
    name: '',
    description: '',
    pros: null,
    cons: null,
  });
  const [criteriaForm, setCriteriaForm] = useState({
    mustHaves: [],
    niceToHaves: [],
  });
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingCriteria, setSavingCriteria] = useState(false);
  const [costForm, setCostForm] = useState({});
  const [savingCosts, setSavingCosts] = useState(false);

  const syncDetailsForm = (nextSearch) => {
    setDetailsForm({
      name: nextSearch?.name || '',
      description: nextSearch?.description || '',
      pros: nextSearch?.pros ?? null,
      cons: nextSearch?.cons ?? null,
    });
    setCriteriaForm({
      mustHaves: normalizeCriteriaList(nextSearch?.mustHaves, nextSearch?.assetType || 'home'),
      niceToHaves: normalizeCriteriaList(nextSearch?.niceToHaves, nextSearch?.assetType || 'home'),
    });
    setCostForm(nextSearch?.costDefaults || {});
  };

  const load = async () => {
    setLoading(true);
    try {
      const [searchData, poiData, memberData] = await Promise.all([
        searchesAPI.get(searchId),
        api.pois.list(),
        searchesAPI.members(searchId),
      ]);
      setSearch(searchData.search);
      syncDetailsForm(searchData.search);
      setPois(poiData.pois);
      setMembers(memberData.members);
      setPendingInvites(memberData.pendingInvites || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [searchId]);

  const handleAddPoi = async (e) => {
    e.preventDefault();
    setSavingPoi(true);
    setError('');

    try {
      await api.pois.create({
        ...addForm,
        isPrimary: pois.length === 0 ? true : addForm.isPrimary,
      });
      setAddForm(emptyPoiForm);
      showSuccess('Location added.');
      await load();
    } catch (err) {
      setError(err.message);
      showError(err.message);
    } finally {
      setSavingPoi(false);
    }
  };

  const startEditPoi = (poi) => {
    setEditingPoiId(poi.id);
    setEditForm(poiToForm(poi));
    setError('');
  };

  const cancelEditPoi = () => {
    setEditingPoiId(null);
    setEditForm(emptyPoiForm);
  };

  const handleSaveEditPoi = async (e) => {
    e.preventDefault();
    setSavingPoi(true);
    setError('');

    try {
      await api.pois.update(editingPoiId, editForm);
      setEditingPoiId(null);
      setEditForm(emptyPoiForm);
      showSuccess('Location updated.');
      await load();
    } catch (err) {
      setError(err.message);
      showError(err.message);
    } finally {
      setSavingPoi(false);
    }
  };

  const handleSetPrimary = async (poiId) => {
    try {
      await api.pois.update(poiId, { isPrimary: true });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleConfirmDeletePoi = async () => {
    if (!poiToDelete) return;

    setDeletingPoi(true);
    setError('');

    try {
      await api.pois.remove(poiToDelete.id);
      if (editingPoiId === poiToDelete.id) {
        cancelEditPoi();
      }
      setPoiToDelete(null);
      showSuccess('Location removed.');
      await load();
    } catch (err) {
      setError(err.message);
      showError(err.message);
    } finally {
      setDeletingPoi(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    setSendingInvite(true);
    setError('');

    try {
      const result = await searchesAPI.createInvite(searchId, {
        email,
        role: inviteRole,
      });
      setInviteEmail('');
      showInviteCreated({ email, inviteUrl: result.inviteUrl, emailSent: result.emailSent });
      await load();
    } catch (err) {
      setError(err.message);
      showError(err.message);
    } finally {
      setSendingInvite(false);
    }
  };

  const handleConfirmCancelInvite = async () => {
    if (!inviteToCancel) return;

    setCancellingInviteId(inviteToCancel.id);
    setError('');

    try {
      await searchesAPI.cancelInvite(searchId, inviteToCancel.id);
      setInviteToCancel(null);
      showSuccess('Invite cancelled.');
      await load();
    } catch (err) {
      setError(err.message);
      showError(err.message);
    } finally {
      setCancellingInviteId(null);
    }
  };

  const handleResendInvite = async (invite) => {
    setResendingInviteId(invite.id);
    setError('');

    try {
      const result = await searchesAPI.resendInvite(searchId, invite.id);
      showInviteCreated({
        email: invite.email,
        inviteUrl: result.inviteUrl,
        emailSent: result.emailSent,
      });
      await load();
    } catch (err) {
      setError(err.message);
      showError(err.message);
    } finally {
      setResendingInviteId(null);
    }
  };

  const handleCopyInviteLink = async (inviteUrl) => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      showSuccess('Invite link copied.');
    } catch {
      showError('Could not copy link.');
    }
  };

  const handleMemberRoleChange = async (member, role) => {
    if (member.role === role) return;

    setUpdatingMemberId(member.id);
    setError('');

    try {
      await searchesAPI.updateMemberRole(searchId, member.user.id, role);
      const roleLabel = MEMBER_ROLES.find((r) => r.value === role)?.label || role;
      showSuccess(`Updated ${member.user.email} to ${roleLabel}.`);
      await load();
    } catch (err) {
      setError(err.message);
      showError(err.message);
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;

    setRemovingMemberId(memberToRemove.user.id);
    setError('');

    try {
      await searchesAPI.removeMember(searchId, memberToRemove.user.id);
      showSuccess(`Removed ${memberToRemove.user.email}.`);
      setMemberToRemove(null);
      await load();
    } catch (err) {
      setError(err.message);
      showError(err.message);
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setSavingDetails(true);
    setError('');

    try {
      const data = await searchesAPI.update(searchId, {
        name: detailsForm.name.trim(),
        description: detailsForm.description.trim() || null,
        pros: detailsForm.pros,
        cons: detailsForm.cons,
      });
      setSearch((current) => ({ ...current, ...data.search }));
      syncDetailsForm(data.search);
      showSuccess('Search details saved.');
    } catch (err) {
      setError(err.message);
      showError(err.message);
    } finally {
      setSavingDetails(false);
    }
  };

  const handleSaveCriteria = async (e) => {
    e.preventDefault();
    setSavingCriteria(true);
    setError('');

    try {
      const data = await searchesAPI.update(searchId, {
        mustHaves: criteriaForm.mustHaves,
        niceToHaves: criteriaForm.niceToHaves,
      });
      setSearch((current) => ({ ...current, ...data.search }));
      syncDetailsForm(data.search);
      showSuccess('Must / nice rules saved.');
    } catch (err) {
      setError(err.message);
      showError(err.message);
    } finally {
      setSavingCriteria(false);
    }
  };

  const handleSaveCostDefaults = async (e) => {
    e.preventDefault();
    setSavingCosts(true);
    setError('');

    try {
      const cleaned = {};
      for (const [key, val] of Object.entries(costForm)) {
        if (val !== '' && val != null) cleaned[key] = val;
      }
      const data = await searchesAPI.update(searchId, {
        costDefaults: Object.keys(cleaned).length > 0 ? cleaned : null,
      });
      setSearch((current) => ({ ...current, ...data.search }));
      setCostForm(data.search.costDefaults || {});
      showSuccess('Cost defaults saved.');
    } catch (err) {
      setError(err.message);
      showError(err.message);
    } finally {
      setSavingCosts(false);
    }
  };

  const updateCostField = (field, raw) => {
    setCostForm((c) => {
      const next = { ...c };
      if (raw === '' || raw == null) {
        delete next[field];
      } else {
        next[field] = Number(raw);
      }
      return next;
    });
  };

  const isOwner = search?.role === 'owner';
  const canEdit = search?.role === 'owner' || search?.role === 'editor';
  const boatMode = isBoatSearch(search?.assetType);

  if (loading) {
    return <p className="text-pine-600">Loading settings...</p>;
  }

  return (
    <div>
      <PageHeader
        title="Search settings"
        description={search?.name ? `Locations and collaborators for ${search.name}.` : undefined}
      />

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <Card className="mb-6">
        <form onSubmit={handleSaveDetails} className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium text-pine-900">Search details</h2>
              <p className="mt-1 text-sm text-pine-600">
                Name, description, and the tradeoffs that matter for this search.
              </p>
            </div>
            <AssetTypeBadge assetType={search?.assetType} />
          </div>

          <FormField label="Name" htmlFor="search-name">
            <input
              id="search-name"
              value={detailsForm.name}
              onChange={(e) => setDetailsForm((current) => ({ ...current, name: e.target.value }))}
              disabled={!canEdit}
              className="w-full rounded-md border border-pine-200 px-3 py-2 text-sm disabled:bg-pine-50"
              required
            />
          </FormField>

          <FormField label="Description" htmlFor="search-description">
            <textarea
              id="search-description"
              value={detailsForm.description}
              onChange={(e) => setDetailsForm((current) => ({ ...current, description: e.target.value }))}
              disabled={!canEdit}
              rows={3}
              placeholder={boatMode ? 'What kind of boats are you looking for?' : 'What are you looking for in this search?'}
              className="w-full rounded-md border border-pine-200 px-3 py-2 text-sm disabled:bg-pine-50"
            />
          </FormField>

          <div className="grid gap-6 sm:grid-cols-2">
            <EditableLineList
              label="Pros"
              value={detailsForm.pros}
              onChange={(pros) => setDetailsForm((current) => ({ ...current, pros }))}
              placeholder="Add a pro…"
              disabled={!canEdit}
            />
            <EditableLineList
              label="Cons"
              value={detailsForm.cons}
              onChange={(cons) => setDetailsForm((current) => ({ ...current, cons }))}
              placeholder="Add a con…"
              disabled={!canEdit}
            />
          </div>

          {canEdit && (
            <Button type="submit" disabled={savingDetails}>
              {savingDetails ? 'Saving...' : 'Save details'}
            </Button>
          )}
        </form>
      </Card>

      <Card className="mb-6">
        <form onSubmit={handleSaveCriteria} className="space-y-6">
          <div>
            <h2 className="text-lg font-medium text-pine-900">Must-haves & nice-to-haves</h2>
            <p className="mt-1 text-sm text-pine-600">
              Shared rules for this search. Listings get a quiet fit score from these automatically.
            </p>
          </div>

          <CriteriaEditor
            title="Must-haves"
            description="Deal-breakers. Missing these shows as a warning on listings."
            value={criteriaForm.mustHaves}
            onChange={(mustHaves) => setCriteriaForm((current) => ({ ...current, mustHaves }))}
            assetType={search?.assetType || 'home'}
            disabled={!canEdit}
          />

          <CriteriaEditor
            title="Nice-to-haves"
            description="Preferences that raise the score when met."
            value={criteriaForm.niceToHaves}
            onChange={(niceToHaves) => setCriteriaForm((current) => ({ ...current, niceToHaves }))}
            assetType={search?.assetType || 'home'}
            disabled={!canEdit}
          />

          {canEdit && (
            <Button type="submit" disabled={savingCriteria}>
              {savingCriteria ? 'Saving...' : 'Save rules'}
            </Button>
          )}
        </form>
      </Card>

      <Card className="mb-6">
        <form onSubmit={handleSaveCostDefaults} className="space-y-4">
          <div>
            <h2 className="text-lg font-medium text-pine-900">Cost defaults</h2>
            <p className="mt-1 text-sm text-pine-600">
              Fixed costs that apply to every {boatMode ? 'boat' : 'listing'} in this search unless overridden on a specific listing.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Annual insurance ($)" htmlFor="cd-insurance">
              <input
                id="cd-insurance"
                type="number"
                min="0"
                step="1"
                value={costForm.annualInsurance ?? ''}
                onChange={(e) => updateCostField('annualInsurance', e.target.value)}
                disabled={!canEdit}
                placeholder="e.g. 2000"
                className="w-full rounded-md border border-pine-200 px-3 py-2 text-sm disabled:bg-pine-50"
              />
            </FormField>

            <FormField label="Annual tax ($)" htmlFor="cd-tax">
              <input
                id="cd-tax"
                type="number"
                min="0"
                step="1"
                value={costForm.annualTax ?? ''}
                onChange={(e) => updateCostField('annualTax', e.target.value)}
                disabled={!canEdit}
                placeholder="e.g. 500"
                className="w-full rounded-md border border-pine-200 px-3 py-2 text-sm disabled:bg-pine-50"
              />
            </FormField>

            <FormField label="Annual maintenance ($)" htmlFor="cd-maintenance">
              <input
                id="cd-maintenance"
                type="number"
                min="0"
                step="1"
                value={costForm.annualMaintenance ?? ''}
                onChange={(e) => updateCostField('annualMaintenance', e.target.value)}
                disabled={!canEdit}
                placeholder="e.g. 5000"
                className="w-full rounded-md border border-pine-200 px-3 py-2 text-sm disabled:bg-pine-50"
              />
            </FormField>

            {boatMode && (
              <FormField label="Winter storage ($)" htmlFor="cd-winter">
                <input
                  id="cd-winter"
                  type="number"
                  min="0"
                  step="1"
                  value={costForm.winterStorage ?? ''}
                  onChange={(e) => updateCostField('winterStorage', e.target.value)}
                  disabled={!canEdit}
                  placeholder="e.g. 3000"
                  className="w-full rounded-md border border-pine-200 px-3 py-2 text-sm disabled:bg-pine-50"
                />
              </FormField>
            )}

            <FormField label="Down payment (%)" htmlFor="cd-down">
              <input
                id="cd-down"
                type="number"
                min="0"
                max="100"
                step="1"
                value={costForm.downPaymentPct ?? ''}
                onChange={(e) => updateCostField('downPaymentPct', e.target.value)}
                disabled={!canEdit}
                placeholder="e.g. 20"
                className="w-full rounded-md border border-pine-200 px-3 py-2 text-sm disabled:bg-pine-50"
              />
            </FormField>

            <FormField label="Interest rate (%)" htmlFor="cd-rate">
              <input
                id="cd-rate"
                type="number"
                min="0"
                step="0.01"
                value={costForm.interestRate ?? ''}
                onChange={(e) => updateCostField('interestRate', e.target.value)}
                disabled={!canEdit}
                placeholder="e.g. 7.5"
                className="w-full rounded-md border border-pine-200 px-3 py-2 text-sm disabled:bg-pine-50"
              />
            </FormField>

            <FormField label="Loan term (years)" htmlFor="cd-term">
              <input
                id="cd-term"
                type="number"
                min="1"
                step="1"
                value={costForm.loanTermYears ?? ''}
                onChange={(e) => updateCostField('loanTermYears', e.target.value)}
                disabled={!canEdit}
                placeholder="e.g. 20"
                className="w-full rounded-md border border-pine-200 px-3 py-2 text-sm disabled:bg-pine-50"
              />
            </FormField>
          </div>

          <p className="text-xs text-pine-500">
            These are search-wide defaults. You can still override any value on individual listings.
          </p>

          {canEdit && (
            <Button type="submit" disabled={savingCosts}>
              {savingCosts ? 'Saving...' : 'Save cost defaults'}
            </Button>
          )}
        </form>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-medium text-pine-900">Your locations</h2>
          <p className="mt-1 text-sm text-pine-600">
            Where you are coming from. Drive times use these — the primary location appears on listing cards.
          </p>

          {pois.length === 0 ? (
            <p className="mt-4 text-sm text-pine-600">
              Add at least one location (e.g. your current home) for drive times
              {boatMode ? ' from where you keep or launch your boat.' : '.'}
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {pois.map((poi) => (
                <li key={poi.id}>
                  {editingPoiId === poi.id ? (
                    <form
                      onSubmit={handleSaveEditPoi}
                      className="space-y-3 rounded-md border border-pine-200 bg-pine-50 p-3"
                    >
                      <h3 className="text-sm font-medium text-pine-900">Edit location</h3>
                      <PoiFormFields
                        form={editForm}
                        onChange={setEditForm}
                        idPrefix={`edit-${poi.id}`}
                      />
                      <label className="flex items-center gap-2 text-sm text-pine-700">
                        <input
                          type="checkbox"
                          checked={editForm.isPrimary}
                          onChange={(e) => setEditForm({ ...editForm, isPrimary: e.target.checked })}
                        />
                        Primary location
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <Button type="submit" disabled={savingPoi}>
                          {savingPoi ? 'Saving...' : 'Save'}
                        </Button>
                        <Button type="button" variant="secondary" onClick={cancelEditPoi}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-start justify-between gap-3 rounded-md border border-pine-100 px-3 py-2">
                      <div className="min-w-0">
                        <p className="font-medium text-pine-900">
                          {poi.label}
                          {poi.isPrimary && (
                            <span className="ml-2 rounded bg-pine-100 px-2 py-0.5 text-xs text-pine-700">Primary</span>
                          )}
                        </p>
                        <p className="text-xs text-pine-500">
                          {POI_TYPES.find((t) => t.value === poi.type)?.label || poi.type}
                        </p>
                        {(poi.address || poi.city || poi.state || poi.zip) && (
                          <p className="mt-0.5 text-sm text-pine-700">
                            {[poi.address, poi.city, poi.state, poi.zip].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                      {canEdit && (
                        <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                          {!poi.isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(poi.id)}
                              className="text-xs text-pine-600 hover:text-pine-800"
                            >
                              Set primary
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => startEditPoi(poi)}
                            className="text-xs text-pine-600 hover:text-pine-800"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setPoiToDelete(poi)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {canEdit && !editingPoiId && (
            <form onSubmit={handleAddPoi} className="mt-6 space-y-3 border-t border-pine-100 pt-4">
              <h3 className="text-sm font-medium text-pine-800">Add location</h3>
              <PoiFormFields form={addForm} onChange={setAddForm} idPrefix="add" />
              {pois.length > 0 && (
                <label className="flex items-center gap-2 text-sm text-pine-700">
                  <input
                    type="checkbox"
                    checked={addForm.isPrimary}
                    onChange={(e) => setAddForm({ ...addForm, isPrimary: e.target.checked })}
                  />
                  Set as primary location
                </label>
              )}
              <Button type="submit" disabled={savingPoi}>
                {savingPoi ? 'Adding...' : 'Add location'}
              </Button>
            </form>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-medium text-pine-900">Members</h2>
          <p className="mt-1 text-sm text-pine-600">
            People with access to this search. Invited users show as pending until they accept.
          </p>
          <ul className="mt-4 space-y-2">
            {members.map((member) => {
              const isCurrentUser = member.user.id === user?.id;
              const canManageMember = isOwner && !isCurrentUser;

              return (
              <li
                key={member.id}
                className="flex items-start justify-between gap-3 rounded-md border border-pine-100 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <span className="font-medium text-pine-900">{member.user.email}</span>
                  {isCurrentUser && (
                    <span className="ml-2 text-pine-500">(you)</span>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                  {canManageMember ? (
                    <>
                      <select
                        value={member.role}
                        onChange={(e) => handleMemberRoleChange(member, e.target.value)}
                        disabled={updatingMemberId === member.id}
                        aria-label={`Role for ${member.user.email}`}
                        className="rounded-md border border-pine-200 bg-white px-2 py-1 text-sm text-pine-800"
                      >
                        {MEMBER_ROLES.map((role) => (
                          <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setMemberToRemove(member)}
                        className="text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-pine-500 capitalize">{member.role}</span>
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                        Active
                      </span>
                    </>
                  )}
                </div>
              </li>
            );
            })}
            {pendingInvites.map((invite) => (
              <li
                key={invite.id}
                className="flex items-start justify-between gap-3 rounded-md border border-amber-100 bg-amber-50/50 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <span className="font-medium text-pine-900">{invite.email}</span>
                  <span className="ml-2 text-pine-500">{invite.role}</span>
                  <p className="mt-0.5 text-xs text-pine-500">
                    Invited {new Date(invite.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {isOwner && (
                  <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Pending
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyInviteLink(invite.inviteUrl)}
                        className="text-xs text-pine-600 hover:text-pine-800"
                      >
                        Copy link
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResendInvite(invite)}
                        disabled={resendingInviteId === invite.id}
                        className="text-xs text-pine-600 hover:text-pine-800 disabled:opacity-50"
                      >
                        {resendingInviteId === invite.id ? 'Sending...' : 'Resend'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setInviteToCancel(invite)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Cancel invite
                      </button>
                  </div>
                )}
              </li>
            ))}
            {members.length === 0 && pendingInvites.length === 0 && (
              <li className="text-sm text-pine-600">No members yet.</li>
            )}
          </ul>

          {isOwner && (
            <form onSubmit={handleInvite} className="mt-6 space-y-3 border-t border-pine-100 pt-4">
              <h3 className="text-sm font-medium text-pine-800">Invite by email</h3>
              <FormField label="Email" htmlFor="invite-email">
                <input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded-md border border-pine-200 px-3 py-2 text-sm"
                  required
                />
              </FormField>
              <FormField label="Role" htmlFor="invite-role">
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full rounded-md border border-pine-200 px-3 py-2 text-sm"
                >
                  <option value="owner">Owner</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </FormField>
              <Button type="submit" disabled={sendingInvite}>
                {sendingInvite ? 'Sending...' : 'Send invite'}
              </Button>
            </form>
          )}
        </Card>
      </div>

      {inviteToCancel && (
        <ConfirmModal
          title="Cancel invite"
          message={`Cancel the invite for ${inviteToCancel.email}? They won't be able to use the current link.`}
          onConfirm={handleConfirmCancelInvite}
          onCancel={() => setInviteToCancel(null)}
          loading={cancellingInviteId === inviteToCancel.id}
          loadingLabel="Cancelling..."
          confirmText="Cancel invite"
        />
      )}

      {poiToDelete && (
        <ConfirmModal
          title="Remove location"
          message={`Remove "${poiToDelete.label}"? Drive times from this location will be deleted.`}
          onConfirm={handleConfirmDeletePoi}
          onCancel={() => setPoiToDelete(null)}
          loading={deletingPoi}
          loadingLabel="Removing..."
          confirmText="Remove"
        />
      )}

      {memberToRemove && (
        <ConfirmModal
          title="Remove member"
          message={`Remove ${memberToRemove.user.email} from this search? They will lose access immediately.`}
          onConfirm={handleConfirmRemoveMember}
          onCancel={() => setMemberToRemove(null)}
          loading={Boolean(removingMemberId)}
          loadingLabel="Removing..."
          confirmText="Remove member"
        />
      )}

      <div className="mt-6 space-y-6">
        <Card>
          <h2 className="text-lg font-medium text-pine-900">Price estimates</h2>
          <p className="mt-1 text-sm text-pine-600">
            Choose which details should drive price estimates. Most searches can stick with the default.
          </p>
          <Link
            to={searchPath(searchId, '/pricing-models')}
            className="mt-3 inline-block text-sm font-medium text-pine-700 hover:text-pine-900"
          >
            Manage price estimates →
          </Link>
        </Card>

        {!boatMode && <ZillowPasteImport canEdit={canEdit} />}
      </div>

    </div>
  );
}
