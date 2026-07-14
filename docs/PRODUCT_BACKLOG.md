# Product backlog — buying experience

Suggestions for making boat and vacation-home decisions easier. Prioritized for impact; not committed ship dates.

## Shipped (recent)

- Multi-asset Searches (homes vs boats)
- YachtWorld + Sailboatdata ingest
- Makes/models with cascading notes and structured encyclopedia specs
- Metric helper tips (hover / mobile sheet)
- Listing detail click-to-edit, nicknames, freshness refresh
- Shortlist / comparison board with sistership comps
- Marinas (boat equivalent of Regions) with carrying costs and seasonality

## Priority next

### 1. Listing ↔ model check (in progress)

When a YachtWorld listing is linked to a `BoatModel` with Sailboatdata specs, compare listing measurements to the expected model values and surface mismatches (e.g. draft 5.9' vs model 7.2' → likely shallow-keel variant).

**Status**
- YachtWorld now maps beam, LWL, draft (± board-up), displacement, ballast, engine, tanks, hull/keel into `Listing`
- API attaches `modelCheck` on serialized listings with a linked model
- Listing detail shows a compare panel
- Refresh also fills measured boat specs (still does not overwrite notes/nickname/status)

**Still useful samples**
- Page source for a boat that already has Sailboatdata on the model (e.g. First 36.7)
- One deep-keel and one shallow-keel listing of the same model, if you have them

### 2. Shortlist / decision board (shipped v1)

Side-by-side 3–5 boats or homes: price, $/ft or $/acre, year, draft (boats), interest, open cons, last refreshed. Optimize for choose, not just browse.

**Status**
- `Listing.shortlisted` Boolean + `shortlistRank` for ordering
- Star toggle on listing cards and detail hero
- Comparison board at `/compare` — shows shortlisted listings as columns, attributes as rows
- Board also accepts explicit `?ids=a,b,c` for ad-hoc comparisons (e.g. from sistership panel)
- Boat-specific rows: $/ft, length, beam, draft, displacement, engine hours, fuel, water
- Home-specific rows: $/acre, $/sqft, beds, baths, sqft, acres, waterfront, drive time
- Pros/cons/notes, criteria fit badge, last refreshed, days on market
- Nav link in main navigation

### 3. Survey / refit readiness checklist

Per-listing templates (rigging age, soft spots, saildrive seals, model-known issues). Seed from model cons so research becomes action.

### 4. Must-haves vs nice-to-haves

Search-level constraints with a quiet “fits” score on listings.

**Status (structured v1)**
- `Search.mustHaves` / `niceToHaves` JSON rules (field + op + value)
- Home and boat field catalogs (price, beds, draft, length, etc.)
- Auto-evaluated; soft score only (no hard hide)
- Edit in Search Settings; badge on listing list rows + detail hero with tooltip breakdown
- Free-text criteria deferred

## Boat-specific

5. **Use-case profiles** — coastal weekender / Great Lakes / gunkhole / passagemaker; tint comfort, capsize, SA/D, draft for that lens.
6. **Sistership comps** (shipped v1) — “vs other tracked [Model]s” panel on listing detail; compact table + “Compare all N” button linking to comparison board filtered by model.
7. **Known-issues digest** — curated, editable model block (not scraped forum spam).
8. **Sea trial / visit log** — structured wind, who went, feel, follow-ups.

## Home-specific

9. **Carrying cost / seasonality** — HOA, insurance ballpark, winter access, well/septic flags. Boat carrying costs now live on the Marina entity (slip fees, winter storage, maintenance, season). Home-side Region carrying costs deferred.
10. **“Can we use it?”** — drive time + calendar / access reality, not just map pins. Marina seasonality (seasonOpen/seasonClose/yearRound) is a first step; drive-time surfacing on comparison board is next.

## Collaboration

11. **Partner disagreement surface** — starred vs passed conflicts.
12. **Stale-data workflow** — push refresh before travel when YachtWorld/Zillow data is old.

## Explicitly deferred

- Replacing YachtWorld/Zillow
- AR / 3D tours / broker messaging
- Metrics without interpretation
- Marina geography, RV type (see [MULTI_ASSET_TYPES.md](./MULTI_ASSET_TYPES.md))

## Compare field targets (listing ↔ model)

| Listing (from YW) | Model (Sailboatdata) | Notes |
|---|---|---|
| `lengthFt` (LOA) | `loaFt` | Already ingested |
| `lwlFt` | `lwlFt` | |
| `beamFt` | `beamFt` | |
| `draftFt` (max) | `draftFt` | Also watch YW `driveUpDraft` for boards |
| `displacementLb` | `displacementLb` | |
| `ballastLb` | `ballastLb` | |
| `engineMake` / `engineHp` | `engineMake` / `engineHp` | Listing may have repower |
| `fuelGal` / `waterGal` | `fuelGal` / `waterGal` | Often approximate |
| `yearBuilt` | `firstBuilt`–`lastBuilt` | Range check |
| `hullMaterial` / `keelType` | `construction` / hull text | Soft match |

Tolerances should be loose enough for unit/rounding noise, strict enough to catch shallow vs deep keel and wrong model linkage.
