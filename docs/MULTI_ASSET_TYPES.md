# Multi-asset vacation types

Plan and test guide for expanding beyond vacation homes to boats (and later RVs).

## Product model

| Concept | Role |
|---|---|
| **Search** | Shared workspace + **asset type** (`home` \| `boat` \| `rv`) |
| **Type switcher** | Filter/group Searches by asset type in the shell |
| **Listing** | Shared research core; type-specific fields on the same table |

Each Search is **one** vacation category. Users can have multiple Searches (e.g. north-woods homes + Great Lakes sailboats) and switch between them.

**Not in first pass:** marina geography (boat analogue of lakes), RV type.

YachtWorld import uses URL fetch (with headless Chromium fallback) plus optional page-source paste.
Production Docker installs system Chromium for that fallback. Leave `PUPPETEER_HEADLESS` / debug vars unset in prod.

## Decisions (locked)

1. Mix types via **multiple Searches**, not mixed listings in one Search.
2. **Regions + lakes** remain **home-only** for now.
3. Search **description + pros/cons** are an **editable list** per Search (category framing).
4. Boat pricing starts with **length + year** (minimal model).
5. **Sail vs motor** is a boat **subtype** (`propulsion`), not a third asset type — stored now for SaaS filtering/segments later.

## Schema

### Search

- `assetType` — `home` (default) \| `boat` \| `rv`
- `description` — short framing copy (already existed)
- `pros` / `cons` — newline-separated editable lists (category tradeoffs)

Asset type is set at create time and **not changed later** (avoids orphaned regions / wrong pricing defaults).

### Listing (boat additions)

Shared: price, status, photos, notes, interest, location (optional), snapshots, comments.

Boat fields:

- `lengthFt` (Float)
- `make`, `model` (String)
- `nickname` (String, optional — shown after make/model in lists)
- `propulsion` — `sail` \| `motor` \| `other` (default `sail`)
- `boatMakeId` / `boatModelId` — links to search-scoped `BoatMake` / `BoatModel` (auto find-or-create from make/model text)

`BoatMake` / `BoatModel` hold description, pros, cons, and notes that cascade onto boat detail pages.

`BoatModel` also stores structured encyclopedia specs (LOA, beam, draft, displacement, sail area, ratios, designer, builder, engine, tankage, sailboatdata URL, etc.) for readable model pages and future YachtWorld listing cross-checks.

`regionId` is **optional**. Required for home listings; null for boats.

Derived API field for boats: `pricePerFoot` when price + length exist.

### Pricing

| Asset | Default features |
|---|---|
| Home | acres, vacant lot, sqft, beds/baths, waterfront, region |
| Boat | `lengthFt`, `yearBuilt` |

Boat comps use length (± ~20%) and matching propulsion when present. `$/ft` is the primary comparison metric.

## UI behavior

| Area | Home | Boat |
|---|---|---|
| Nav | Dashboard, Regions, Listings, Map, Estimator, Price picker, Settings | Same **minus Regions**, plus **Makes** |
| Create Search | Pick Homes or Boats | Same |
| Dashboard | Region stats + home framing | Category pros/cons + boat stats |
| Add listing | Region required; Zillow import | YachtWorld URL + page-source paste; no region; optional nickname |
| Makes & models | — | Search-scoped make → model notes; **Sailboatdata** import on model pages (URL + page-source paste) |
| Estimator | Dream home form | Length / year / propulsion |

## Roadmap (later)

1. More reliable YachtWorld fetch (when bot protection allows)
2. Propulsion as pricing segment / one-hot feature when sample size allows
3. Boat “regions” or marinas
4. Boat “regions” or marinas
5. RV asset type + fields
6. Saas templates for default category pros/cons per type

## Customer experience rules

UI and API messages customers see should stay product-focused. Do not mention roadmap items, internal implementation details, or “coming later” features (e.g. YachtWorld, “regions only for homes”). Hide unavailable capabilities; don’t apologize for them.

## How to test

### Prerequisites

```bash
docker-compose up postgres -d
cd backend && npx prisma migrate deploy && npm run dev
# other terminal
cd frontend && npm run dev
```

### Smoke checklist

**A. Existing home Search still works**

- [ ] Open an existing Search — `assetType` behaves as home
- [ ] Regions nav still visible
- [ ] Add/edit listing still requires a region
- [ ] Pricing estimator still uses home features

**B. Create a boat Search**

- [ ] Searches page → create with type **Boats**
- [ ] Confirm land on new Search dashboard
- [ ] Nav has **no Regions** link
- [ ] Settings → edit description, add pros/cons lines, save

**C. Boat listing + pricing**

- [ ] Add listing with make/model, length (ft), year, propulsion (sail), list price
- [ ] Optional: Import from YachtWorld URL (or page-source paste if URL is blocked)
- [ ] Region not required
- [ ] Listing detail shows length, `$/ft`, propulsion
- [ ] Add ≥3 priced boat listings with length + year
- [ ] Estimator → enter length/year → get an estimate
- [ ] Pricing models page default features are length + year

**Local YachtWorld parser**

```bash
cd backend && npm run parse:yachtworld
# or: npm run parse:yachtworld -- path/to/saved-page.html
```

**D. Type switcher**

- [ ] With both a home and boat Search, switcher/grouping shows types
- [ ] Switching types lands on an appropriate Search (or manage list)

**E. Regression**

- [ ] Home Zillow import unchanged
- [ ] Home vacant-lot / waterfront filters still work on home Search
