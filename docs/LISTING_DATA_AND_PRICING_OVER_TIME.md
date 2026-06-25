# Listing data, refresh, and pricing over time

How Zillow-sourced data, model training, and refresh interact today — and a proposed direction for **stable historical comps**, **safe refresh**, and **sold listings** as a first-class feature.

Related:

- [PRICING_MODEL_EVOLUTION.md](./PRICING_MODEL_EVOLUTION.md) — model algorithms and segments
- [PRICING_UX_BACKLOG.md](./PRICING_UX_BACKLOG.md) — product UX ideas

---

## The problem in plain language

You might spend 12 months saving listings, building regions, and trusting “% above/below model” on each property. Then you **refresh all** from Zillow and:

- Ask prices jump or drop across the market
- Some listings go **sold** or **off market**; Zillow returns less data
- The pricing model **retrains on the new snapshot** — so a home that looked like a deal in March can look overpriced in December even if *your opinion* of the market didn’t change
- Deal labels and Price Picker curves shift, which can feel like the app “changed its mind”

That’s not always wrong (the market did move) — but we need to separate **what the market is doing now** from **what you recorded when you were researching**, and we must not **accidentally erase** good data when a source dries up.

---

## How it works today

### What trains the model

| Input | Behavior |
|-------|----------|
| Training pool | Every listing in the search with a non-null `listPrice` |
| Status filter | **None** — `sold`, `off_market`, `active`, `interested`, etc. all count if they still have `listPrice` |
| When model updates | On listing create/edit/delete, **and on every successful Zillow refresh** (`retrainAfterListingChange`) |
| Stored segments | Current fit only — no “model as of March 2025” history |

### What refresh does (`refreshFromSource.js`)

1. Fetches latest Zillow data (ZillAPI or browser paste path).
2. Merges field-by-field: `scraped.field ?? existing.field` for most columns.
3. **Status:** If your listing is `interested` or `passed`, status is **not** overwritten by scrape; otherwise status updates from Zillow (`active`, `pending`, `sold`, `off_market`).
4. Sets `fetchedAt` to now.
5. If **list price or status** changed → appends a `ListingSnapshot` row.
6. **Retrains** pricing models for that search.

### What we already preserve (partially)

- **Failed refresh** (API error, 404, no property) → no DB update; existing row untouched.
- **Null/missing scraped fields** → keep existing value (`??` merge).
- **Research statuses** (`interested` / `passed`) → not clobbered by Zillow status on refresh.
- **Price history** → `ListingSnapshot` on price/status changes (shown on listing detail).

### Gaps and risks today

| Risk | Why it matters |
|------|----------------|
| **No “frozen” sold record** | After sold, refresh may still change beds/acres/photos if Zillow returns different partial data |
| **Empty arrays overwrite** | `photoUrls: scraped ?? existing` — an empty `[]` from API can **wipe photos** (not nullish) |
| **Single price column** | `listPrice` is both “ask when saved” and “ask after refresh” — no locked “price when I added this” |
| **Model always current** | No view of “what the model would have said last summer” |
| **Bulk refresh = bulk retrain** | Refresh all stale can shift every estimate at once with no preview |
| **Sold ≠ comp library** | `soldPrice` is stored but not used for training or a dedicated sold-comps view |
| **Off-market / delisted** | If Zillow drops fields but call succeeds, merge behavior may still drift attributes |

---

## Principles for the product

1. **Research memory vs live market** — Users care about both; the UI should say which one they’re looking at.
2. **Never destroy user research on a bad or sparse fetch** — Failed refresh = no-op; sold/off-market = freeze or merge conservatively.
3. **Models should declare what they’re trained on** — e.g. “active + interested asks” vs “includes sold”.
4. **Bulk operations deserve a preview** — Especially refresh-all and full retrain.
5. **Sold data is valuable** — Treat sold listings as comps, not as dead rows.

---

## Proposed concepts

### 1. Listing lifecycle & data freeze

```
active / pending  →  user marks sold OR refresh detects SOLD  →  sold (frozen)
                    →  refresh detects OFF_MARKET / delist   →  off_market (frozen)
```

**On transition to `sold` (manual or detected):**

- Capture **`soldPrice`** and **`soldAt`** (date) if available from Zillow
- Optionally capture **`finalListPrice`** = last ask before sale
- Set **`dataFrozenAt`** or `refreshPolicy: 'frozen'`
- **Refresh behavior:** only update sold-related fields (sold price, sold date); do **not** overwrite beds, acres, photos, list price used for history

**On failed refresh** (404, delisted, no property):

- Keep all fields; set `lastRefreshAttemptAt` + `refreshStatus: 'source_unavailable'`
- Show badge: “Could not refresh — last known data from {date}”

### 2. Two prices per listing (minimal schema addition)

| Field | Meaning |
|-------|---------|
| `listPrice` | **Current** ask from last successful refresh (live) |
| `listPriceAtSave` or first snapshot | **Price when you first saved** (or when you marked interested) |
| `soldPrice` | Closing price when sold |
| Snapshots | Full timeline of ask/status changes |

Deal labels could show both:

- *“12% above model today”*
- *“Was 5% below model when you saved it in April”*

### 3. Training pools (user-visible, not jargon)

Let the default model choose what comps enter training:

| Pool | Includes | Use case |
|------|----------|----------|
| **Active research** (default) | `active`, `pending`, `interested` with list price | “What’s on the market now” |
| **All saved asks** | Everything with `listPrice` | Current behavior |
| **Sold comps** | `sold` with `soldPrice` | “What things actually closed for” |
| **Point-in-time** (later) | Snapshots as of date | Historical research |

Training target for sold pool: **`soldPrice`** (or last list + sold pair for discount/premium analysis).

UI copy example: *“Model trained on 14 active listings and 6 sold comps in Eagle River.”*

### 4. Refresh policies

Per listing or per search setting:

| Policy | Behavior |
|--------|----------|
| **Live** (default for active) | Merge scrape; update ask; retrain |
| **Frozen** (auto on sold) | No field overwrites except sold metadata |
| **Ask only** | Update `listPrice`, `status`, `daysOnMarket` — never beds/acres/photos |

**Conservative merge rules (engineering):**

- Treat empty arrays / empty strings as “no update” for photos, description, etc.
- Require minimum field set from scrape before applying (e.g. must have price OR explicit status)
- Dry-run mode for bulk refresh (see below)

### 5. Bulk refresh preview

Before “Refresh all (42 listings)”:

```
┌─────────────────────────────────────────────┐
│ Preview refresh                              │
│ 38 OK · 2 sold (will freeze) · 2 unavailable │
│                                              │
│ Price changes: 9 listings                    │
│  · Long Lake — $425k → $399k                │
│  · …                                         │
│                                              │
│ Model impact: ~$28k median shift in Eagle River │
│                                              │
│ [ Refresh all ]  [ Refresh without retrain ] │
└─────────────────────────────────────────────┘
```

Options:

- **Refresh + retrain** (default)
- **Refresh only** — update listings; user triggers retrain from Pricing Models when ready
- **Skip frozen / sold**

### 6. Pricing signals over time

Extend `ListingSnapshot` (or new table) to store at capture time:

- `estimatedPrice` (model prediction then)
- `modelTrainedAt` / `modelVersion`
- Optional: segment used (`all` / `region` / `similar`)

Enables:

- Chart: list price vs model estimate over time
- “This looked fair in June; market and model both say high now”

### 7. Sold listings as a feature

**User-facing:**

- Filter: Active | Sold | Off market
- **Sold comps** page or region column: address, sold price, $/acre, sold date, days on market
- Import sold from Zillow when status = SOLD (populate `soldPrice`)
- Optional: manual “add sold comp” (address + sold price + basics) without live URL

**Model-facing:**

- Separate segment `soldComps` or toggle “Include sold in model”
- Price Picker note when pool mixes sold vs active: *“Sold comps reflect closing prices; active listings reflect asks.”*

**Ingest:**

- ZillAPI already maps `SOLD` → `sold`, `lastSoldPrice` → `soldPrice`
- On sold detection at refresh: run transition workflow (freeze + snapshot + optional move to sold pool)

### 8. Data quality checks

Lightweight validation on every refresh (warnings, not blockers):

| Check | Warning |
|-------|---------|
| Price change &gt; 40% | “Large price change — confirm?” |
| Beds/acres changed | “Property details changed — review” |
| List price missing after having one | “Ask removed — kept your last price” |
| Status sold but no sold price | “Sold — add closing price if you have it” |

Search-level **health** card:

- N listings stale &gt; 30 days
- N refresh failures
- N sold without sold price
- Model sample count per region

---

## Scenarios

### Scenario A: 12 months of research, then refresh all

**Today:** All asks update; model retrains; deal badges shuffle.

**Proposed:**

1. Preview shows price deltas and regions most affected
2. User chooses refresh + retrain, or refresh then review
3. Sold listings frozen — still in comp library, not overwriting attrs
4. Listing detail shows timeline: “You saved at $X · peaked at $Y · now $Z”

### Scenario B: Listing sells; Zillow page sparse or 404

**Today:** Refresh may fail (good) or succeed with partial data (risky).

**Proposed:**

1. Last successful refresh detected `sold` → freeze row, store `soldPrice`
2. Later refresh 404 → no-op, badge “source unavailable”
3. Row stays in **Sold comps** with last known photos/specs

### Scenario C: Market rips higher; nothing “wrong” with the app

**Proposed:** Copy distinguishes market move from model drift:

- *“Ask is up $40k since you saved; model is up $35k — still in line.”*
- vs *“Ask flat but model dropped after 8 new cheaper comps in region.”*

---

## Suggested implementation phases

### Phase A — Safety (high priority, small)

- [ ] Conservative merge: don’t overwrite with empty arrays / empty strings
- [ ] On refresh failure: record `refreshStatus`, don’t touch row
- [ ] On status → `sold`: freeze policy (stop overwriting core attrs)
- [ ] Don’t retrain if refresh made **no** price/feature changes (optional flag)

### Phase B — Sold comps (high product value)

- [ ] Sold filter + sold comps list (region, $/acre, sold date)
- [ ] Populate `soldPrice` / `soldAt` on sold transition from ZillAPI
- [ ] Training pool toggle: active-only vs include-sold (train on `soldPrice` for sold rows)

### Phase C — Time awareness

- [ ] Snapshot stores model estimate at change time
- [ ] Listing detail: price + estimate timeline
- [ ] `listPriceAtSave` or derive from first snapshot

### Phase D — Bulk refresh UX

- [ ] Dry-run preview endpoint
- [ ] “Refresh without retrain” option
- [ ] Summary email-style report after bulk refresh

### Phase E — Advanced

- [ ] Point-in-time model (“as of date” for research export)
- [ ] Manual sold comp entry
- [ ] External sold data source (county recorder, etc.) — long term

---

## Open questions for product decisions

1. **Default training pool:** Active-only, or all saved asks (current)?
2. **When sold is detected:** Auto-freeze, or ask user to confirm?
3. **Interested/passed with stale ask:** Still train on their list price, or exclude until refreshed?
4. **Bulk refresh:** Always retrain, or separate button on Pricing Models?
5. **Sold without sold price:** Exclude from sold comps pool, or use last ask as proxy (with caveat)?

---

## Summary

| Concern | Direction |
|---------|-----------|
| Models change after refresh | Expected — but add preview, optional defer-retrain, and historical snapshots |
| 12-month research invalidated | Separate **live** vs **at-save** pricing; timeline on listing |
| Data overwritten when sold/delisted | **Freeze** sold rows; failed refresh = no-op; conservative merge |
| Sold listings | First-class **sold comps** pool; train on `soldPrice`; don’t lose rows |
| Data quality | Warnings on big deltas; refresh health on dashboard |

This is a discussion doc — nothing here is implemented yet beyond what’s noted in **How it works today**. Phase A + B are the best starting point for trust and comp-library value.
