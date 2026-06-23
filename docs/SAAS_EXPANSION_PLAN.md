# SaaS expansion plan — from private tracker to shared home search

How to evolve North Woods Home Tracker into a multi-user product where people create **searches**, add **points of interest** (work, school, home), collaborate, and track listings for any home purchase — not only vacation properties.

**Status:** Phases 1–3 implemented (June 2025). See [Implementation status](#implementation-status-june-2025) below.  
**Locked decisions:** [SAAS_IMPLEMENTATION.md](./SAAS_IMPLEMENTATION.md)  
**Related:** [GUIDE.md](./GUIDE.md)

---

## Implementation status (June 2025)

| Phase | Goal | Status |
|-------|------|--------|
| **1** | Search workspace + tenancy | ✅ Done |
| **2** | POIs + multi-origin commute | ✅ Done (listing cards still missing drive time badge) |
| **3** | Sharing + invites | ✅ Done (viewer UI read-only enforcement pending) |
| **4** | General-home polish | ⏸ Deferred (vacation-home focus) |
| **5** | Billing / ops / legal | ❌ Not started |

### v1 MVP checklist

| Item | Status |
|------|--------|
| Search + SearchMember + scoped data | ✅ |
| POIs + ListingCommute | ✅ |
| Primary POI drive time on listing **cards** | ❌ |
| Full commute list on listing detail | ✅ |
| Email invites (Resend) + accept flow | ✅ |
| Search switcher + `/searches/:id` routes | ✅ |
| Open registration | ✅ |
| Member remove + role change | ✅ |
| Viewer role hides edit UI | ❌ |
| Search isolation tests | ❌ |
| Production deploy (myvacationhomesearch.com) | ❌ |

### What's next (priority order)

1. **Viewer UI** — hide Add/Edit/Delete for `viewer` role across the app
2. **Drive time on listing cards** — show primary POI commute (locked in implementation spec)
3. **Isolation tests** — verify User A cannot access User B's search data
4. **Strip `User.home*` from profile** — POIs are the commute source of truth
5. **Production deploy** — DNS, SSL, env vars (`RESEND_*`, `GOOGLE_MAPS_API_KEY`, `FRONTEND_URL`)
6. **Legal** — Terms/Privacy, Zillow paste disclaimer

---

## Executive summary

**Verdict: This is a reasonable evolution, not a rewrite — but it is a deliberate architectural shift, not a rename.**

The app already has the hard parts of a home-search tool: listings, areas (regions), maps, drive time, price history, ML estimates, and collaboration primitives (comments). What it lacks is **workspace isolation** (everything is one global database today) and **multi-origin commute logic** (drive time assumes one home on the user profile).

The core lift is introducing a **`Search`** workspace that owns data, plus **`SearchMember`** for sharing, plus **`PointOfInterest`** for work/school/home anchors. Most routes, pages, and services get a `searchId` filter — systematic but mechanical.

**Rough effort for a credible SaaS MVP:** 4–8 weeks part-time (or 2–4 weeks focused full-time), depending on sharing polish, POI drive-time UX, and how much vacation-specific UI (lakes, vacant lots) you generalize vs. keep optional.

---

## What you have today (strengths)

| Area | Today | SaaS-ready? |
|------|--------|-------------|
| Auth | Email/password, session cookies, bcrypt | ✅ Extend (drop allowlist) |
| Data model | Regions → lakes → listings | ✅ Add `searchId` parent |
| Listings | Rich fields, Zillow paste, photos, snapshots | ✅ Reuse as-is |
| Maps | Leaflet + Google geocode/directions | ✅ Extend for multiple POIs |
| Drive time | Single origin (user profile home) | ⚠️ Rework for POIs |
| Pricing ML | Global `PricingModel` table | ⚠️ Scope per search |
| Collaboration | Comments per entity | ✅ Already user-attributed |
| Sharing | None — implicit “whole app” | ❌ New |
| Tenancy | None — all users see all data | ❌ New |
| Registration | Open signup | ✅ Done |

**Architecture that ages well:** Express + Prisma + React SPA, session auth, service layer (`pricing/`, `maps/`, `ingest/`), derived metrics on listings, snapshot-based price history.

**Architecture that blocks SaaS today:**

1. **No tenant boundary** — `Region`, `Listing`, `Lake`, `PricingModel` have no owner or workspace FK.
2. **Global region slugs** — `slug` is unique across the whole DB; must be unique per search.
3. **Drive time tied to user profile** — `computeRegionDriveTime(regionId, userId)` uses `User.homeLat/Lng`; in SaaS, commute anchors belong to the **search**, and multiple people may care about different anchors.
4. **Cached drive time on listing/region** — `driveTimeMinutes` is a single number; with multiple POIs you need per-POI times or a “primary POI” convention.
5. **Open registration blocked** — `USER_EMAILS` is correct for a private couple, wrong for SaaS.

---

## Target product model

### Core concepts

```
User
  └── participates in many Searches (via SearchMember)
        ├── Points of interest (home, work, school, …)
        ├── Regions / areas under consideration
        ├── Listings
        ├── Lakes / places (optional — vacation niche)
        ├── Pricing models (ML per search)
        └── Comments
```

### Search (workspace)

A **search** is one home-buying journey: “Relocate to Madison 2026”, “Lake house up north”, “First home in Oak Park”.

| Field | Purpose |
|-------|---------|
| `name` | Display name |
| `slug` | URL segment |
| `description` | Optional |
| `searchType` | `primary_home` \| `vacation` \| `investment` (optional, drives UI defaults) |
| `status` | `active` \| `paused` \| `closed` |
| `createdById` | Owner |

### SearchMember (sharing)

| Field | Purpose |
|-------|---------|
| `searchId`, `userId` | Membership |
| `role` | `owner` \| `editor` \| `viewer` |
| `invitedAt`, `joinedAt` | Audit |

**Roles (recommended v1):**

- **Owner** — delete search, manage members, full edit
- **Editor** — add/edit listings, regions, POIs, comments
- **Viewer** — read-only (spouse who doesn’t edit, agent, parent)

### Point of interest (POI)

Replaces “home on profile” as the commute anchor **for a search**. Profile can keep personal settings; POIs are search-scoped.

| Field | Purpose |
|-------|---------|
| `searchId` | Parent |
| `type` | `current_home` \| `work` \| `school` \| `family` \| `other` |
| `label` | “Nick’s office”, “Kids’ school” |
| `address`, city, state, zip | Geocode source |
| `latitude`, `longitude` | Cached |
| `isPrimary` | Default for map + single drive-time badge (optional) |
| `sortOrder` | UI ordering |

**Drive time v2:** For each listing (or region center), compute and display times from **each POI** or from the primary POI. Store either:

- **Option A (recommended):** `ListingCommute` join table: `(listingId, poiId, driveTimeMinutes, driveDistanceMiles, calculatedAt)`
- **Option B:** JSON blob on listing — faster to ship, harder to query/sort

Same pattern for regions if you still show area-level commute.

### How current entities map

| Current | SaaS role | Notes |
|---------|-----------|--------|
| **Region** | **Area** (keep name or alias) | Cluster of listings: “Eagle River”, “West Madison”, “Oak Park” |
| **Lake** | Optional **Place** | Keep for vacation vertical; hide or generalize for primary-home searches |
| **Listing** | **Listing** | Universal; `isVacantLot` / `waterfront` become optional filters |
| **User.home\*** | **POI type `current_home`** | Migrate existing profile home into default search POI |
| **PricingModel** | Per-search | Each search trains on its own listing pool |
| **Comment** | Unchanged | Already has `userId`; entities are search-scoped via parent |
| **Dashboard** | **Search dashboard** | Scoped to active search |

---

## Proposed architecture

### Request flow (after)

```
Browser → /searches/:searchId/listings
       → session cookie (who are you?)
       → middleware: are you a member of this search?
       → all Prisma queries: WHERE searchId = :searchId
```

### New middleware

1. **`requireAuth`** — unchanged (who)
2. **`requireSearchMember({ roles })`** — new (which workspace, can they edit?)

Resolve `searchId` from:

- URL path (`/api/searches/:searchId/...`) — **recommended**
- Or header `X-Search-Id` + active search in session — supplementary

### API shape (recommended)

Namespace everything under a search:

```
POST   /api/searches
GET    /api/searches                    # my searches
GET    /api/searches/:searchId
PATCH  /api/searches/:searchId
POST   /api/searches/:searchId/invites

GET    /api/searches/:searchId/pois
POST   /api/searches/:searchId/pois
...

GET    /api/searches/:searchId/regions
GET    /api/searches/:searchId/listings
GET    /api/searches/:searchId/listings/:id/commutes   # all POI drive times
POST   /api/searches/:searchId/listings/:id/commutes   # recalculate
```

Keep `/api/auth/*` global. Maps overview becomes search-scoped.

### Frontend routing

```
/searches                          # picker / create
/searches/:searchId                # dashboard
/searches/:searchId/map
/searches/:searchId/regions/...
/searches/:searchId/listings/...
/searches/:searchId/settings       # POIs, members, search meta
/profile                           # account only (email, password)
```

**Search switcher** in nav (like Slack workspace switcher). Persist last active search in `localStorage` + session.

### Diagram

```
                    ┌─────────────┐
                    │    User     │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │ SearchMember            │
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
       │   Search A   │          │   Search B   │
       └──────┬──────┘          └──────────────┘
              │
    ┌─────────┼─────────┬──────────────┐
    ▼         ▼         ▼              ▼
  POIs    Regions    Listings    PricingModels
              │         │
              ▼         ├── ListingSnapshot
            Lakes       └── ListingCommute → POI
         (optional)
```

---

## Migration strategy (existing app → SaaS)

Do **not** run two codebases. Evolve in place with a migration path for your current data.

### Step 1 — Schema additive (no breaking UI yet)

1. Add `Search`, `SearchMember`, `PointOfInterest`, `ListingCommute` (if Option A).
2. Add nullable `searchId` to `Region`, `Listing`, `Lake`, `PricingModel`.
3. Data migration script:
   - Create search: `"North Woods 2025"` (or your name)
   - Set `searchId` on all existing rows
   - Add both users as `owner` members
   - Copy each user’s `homeLat/Lng` → POI `current_home` (or one shared POI if same household)

### Step 2 — Backend dual-read

- Routes accept optional `searchId`; default to user’s only search if omitted (keeps old frontend working briefly).

### Step 3 — Backend cutover

- All list/get/mutate queries require `searchId`.
- Remove global listing/region endpoints.

### Step 4 — Frontend cutover

- Introduce search routes + switcher.
- Update API client to prefix `/searches/:id`.

### Step 5 — Open registration

- Remove or optionalize `USER_EMAILS`.
- Add invite-by-email for sharing.

**Your current deployment can stay live** on a branch until Step 4; Steps 1–2 can happen on `main` behind feature flags if you prefer.

---

## Phased implementation plan

### Phase 0 — Decisions (you + doc)

Answer questions in [Open decisions](#open-decisions-for-you) below. Lock naming (`Search` vs `Project`).

### Phase 1 — Search workspace foundation (MVP core)

**Goal:** Multiple isolated searches; one user can create more than one; data scoped correctly.

| Work | Details |
|------|---------|
| Schema | `Search`, `SearchMember`, `searchId` on core tables |
| Authz middleware | `requireSearchMember` |
| API | CRUD searches, list “my searches” |
| Migrate existing data | One default search |
| Frontend | Search list + create + switcher; nest routes under `/searches/:id` |
| Tests | User A cannot read User B’s search |

**Exit criteria:** Two users, two searches, no cross-leakage. Your north woods data lives in one search.

### Phase 2 — Points of interest

**Goal:** Work/school/home anchors per search; maps show all POIs.

| Work | Details |
|------|---------|
| Schema | `PointOfInterest` |
| API | CRUD POIs, geocode on save |
| Drive time | `ListingCommute` per (listing, poi); batch recalculate |
| UI | Search settings → POIs; listing detail shows commute grid (“12 min to work”, “38 min to school”) |
| Maps | Multiple POI pins; routes from primary POI (or toggle) |
| Migration | Profile home → POI; deprecate drive-time fields on `User` for commute (keep profile for account) |

**Exit criteria:** Listing shows drive times from 2+ POIs. Map shows POIs + listings.

### Phase 3 — Sharing

**Goal:** Invite spouse, friend, or agent to a search.

| Work | Details |
|------|---------|
| Schema | `SearchInvite` (email, token, role, expiresAt) |
| API | Create invite, accept invite, list members, remove member |
| Email | Transactional email (Resend, Postmark, etc.) — or share link v1 without email |
| UI | Members tab on search settings |
| Authz | Enforce `viewer` vs `editor` on mutations |

**Exit criteria:** Second user joins via invite and sees same listings; viewer cannot delete.

### Phase 4 — Generalize for “any home” (product polish)

| Work | Details |
|------|---------|
| `searchType` | Toggle UI: hide lakes/waterfront emphasis for `primary_home` |
| Copy | “Region” → “Area” or “Neighborhood” in UI (optional) |
| Listing form | School district, HOA, property type — only if you need them |
| Onboarding | Create search → add POIs → add first area → import first listing |

Vacation-specific features stay as **optional modules**, not deleted.

### Phase 5 — SaaS ops (when you charge)

| Work | Details |
|------|---------|
| Billing | Stripe: free tier (1 search, 2 members) + paid |
| Rate limits | Google Maps API per search/month |
| Admin | Support impersonation, abuse monitoring |
| Legal | Terms, privacy, Zillow/MLS posture |

**Defer** until Phases 1–3 prove value.

---

## What reuses vs. what changes

### Reuse with minimal changes (~60–70% of code)

- Zillow / DNR ingest services
- Listing snapshots, price drops, derived `pricePerAcre`
- Photo gallery, listing form structure
- ML pricing service (add `searchId` filter to training pool)
- Leaflet `MapPanel`, route polyline logic
- Comments, auth session, Prisma patterns
- Mobile layout work already done

### Systematic changes (every touchpoint, but mechanical)

- All `prisma.region.findMany` → `where: { searchId }`
- Region `slug` unique → `@@unique([searchId, slug])`
- Frontend API client: base path includes `searchId`
- Nav + dashboard: scoped to active search
- `PricingModel.isDefault` → per search

### Rework (design + code)

- Drive time service: multi-origin, per-listing commute table
- Maps overview: POIs + listings for one search
- Registration / allowlist removal
- Invite + roles authorization

### Optional retire / hide

- `Lake` as first-class UI for non-vacation searches
- `User.showCompAnalysis` column
- Cached `driveTimeMinutes` on `Region`/`Listing` (replace with commute joins)
- Global `USER_EMAILS` gate

---

## Concerns and risks

### 1. Zillow paste in a commercial SaaS

**High priority.** Today you paste Zillow JSON for personal research. A paid product that facilitates Zillow data import may conflict with [Zillow’s terms](https://www.zillow.com/corp/Terms.htm). Mitigations:

- User-provided paste only (no server-side scraping) — same as now
- Clear ToS: user attests they have rights to data they paste
- Long-term: MLS/Realtor API partners, RentCast, Attom, etc.
- Position import as “bring your own listing data” not “Zillow integration”

**You should decide:** Is v1 SaaS still paste-based, or manual entry + future licensed API?

### 2. Google Maps API cost at scale

Drive time × POIs × listings adds up. Per-search quotas, cache aggressively (`ListingCommute` with `calculatedAt`), batch recalculate on demand not on every page load.

### 3. Security — search isolation bugs

The worst SaaS bug is User A seeing User B’s listings. **Every query must include `searchId` + membership check.** Consider Prisma middleware or a `forSearch(searchId)` helper used everywhere. Add integration tests for isolation.

### 4. ML pricing with small samples

Already noisy at 3 listings. Per-search pools are smaller early on. Keep low-sample warnings; don’t market as appraisal.

### 5. “Region” mental model for city buyers

For general homes, users may think in **neighborhoods** or **school districts**, not “north woods regions”. Areas still work; labeling and map boundaries may need school-district layers later (Phase 6+).

### 6. One search vs. many per couple

A couple might want one shared search (your use case) or separate searches (divorce, agent). Support many-to-many via membership; default to inviting collaborator as `editor`.

---

## Open decisions for you

Please weigh in on these before implementation starts.

### Product

1. **Naming:** `Search`, `Project`, or `Hunt`? (URLs: `/searches/...` vs `/projects/...`)
2. **Vacation vs. general:** One product with `searchType` toggle, or two modes/skins?
3. **Lakes:** Keep for vacation searches only, or drop from general-home MVP?
4. **Region rename:** Keep “Region” in UI or switch to “Area” / “Neighborhood”?
5. **Primary POI:** One “main” commute anchor for dashboard badges, or always show all POIs?

### Sharing

6. **Invite v1:** Email invite only, or shareable link (like Google Docs)?
7. **Roles v1:** Is `owner / editor / viewer` enough? Need `agent` (read + comment only)?
8. **Public read link:** Allow unauthenticated view of a search (for sharing with parents)? Security tradeoff.

### Data & import

9. **Zillow paste in SaaS:** Comfortable with BYO-paste + legal disclaimer, or pause import until licensed API?
10. **Listing sources:** Manual + paste only for MVP, or prioritize a paid API early?

### Technical

11. **URL design:** `/searches/:searchId/...` in path (recommended) vs. single URL + search switcher header only?
12. **Migrate existing app:** Convert in place (recommended) or new repo?
13. **Billing timing:** Build sharing first, monetize later? (recommended)

### Go-to-market

14. **First vertical:** Still vacation/north woods niche, or general relocation immediately?
15. **Single-player mode:** Can one user use the app without inviting anyone? (Yes — SearchMember with one owner)

---

## Recommended v1 SaaS MVP (smallest shippable expansion)

If you want the **minimum** to validate “shared home search with POIs”:

1. ✅ `Search` + `SearchMember` (owner/editor/viewer)
2. ✅ `searchId` on regions, listings, pricing models
3. ✅ `PointOfInterest` (home + work + school types)
4. ⚠️ Drive time: primary POI + listing (compute ✅; listing cards ❌)
5. ✅ Invite by email
6. ✅ Search switcher + scoped routes
7. ✅ Open registration
8. ❌ Skip: billing, lakes for non-vacation, CSV, comparison page, MLS API
9. ✅ Full commute list on listing detail; primary-only on cards still TODO

This is **not crazy** — it’s roughly **2–3× the work of your current MVP**, mostly plumbing, if you accept narrow v1 scope.

---

## Suggested order of work (when you greenlight)

```
Week 1–2   Phase 1: Search + searchId scoping + migration + switcher
Week 2–3   Phase 2: POIs + primary commute + map updates
Week 3–4   Phase 3: Invites + roles
Week 4+    Phase 4: General-home polish + open registration
           (Parallel: legal review on Zillow paste positioning)
```

---

## Bottom line

| Question | Answer |
|----------|--------|
| Is expansion feasible? | **Yes** — core listing/area/maps/pricing logic carries over |
| Is it a small tweak? | **No** — systematic tenancy + POI commute rework |
| Is it a full rewrite? | **No** — ~60–70% reuse, incremental migration possible |
| Biggest lift | `searchId` everywhere + authorization + multi-origin commute |
| Biggest risk | Data isolation bugs; Zillow/commercial data terms |
| Should you convert current app? | **Yes, in place** — migrate to one default search, evolve routes |


**Update (June 2025):** Phases 1–3 are implemented. See [What's next](#whats-next-priority-order) at the top of this doc.
Once you answer the [open decisions](#open-decisions-for-you), Phase 1 can start without throwing away what you’ve built.

---

## Appendix: schema sketch (Prisma)

Illustrative — **implemented** in `backend/prisma/schema.prisma` (migration `20250623160000_saas_search_workspace`).

```prisma
model Search {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  description String?
  searchType  String   @default("primary_home") // or enum
  status      String   @default("active")
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members     SearchMember[]
  pois        PointOfInterest[]
  regions     Region[]
  listings    Listing[]
  pricingModels PricingModel[]
}

model SearchMember {
  id        String   @id @default(uuid())
  searchId  String
  userId    String
  role      String   // owner | editor | viewer
  joinedAt  DateTime @default(now())

  search Search @relation(...)
  user   User   @relation(...)

  @@unique([searchId, userId])
}

model PointOfInterest {
  id        String  @id @default(uuid())
  searchId  String
  type      String  // current_home | work | school | family | other
  label     String
  address   String?
  city      String?
  state     String?
  zip       String?
  latitude  Float?
  longitude Float?
  isPrimary Boolean @default(false)
  sortOrder Int     @default(0)

  search    Search @relation(...)
  commutes  ListingCommute[]
}

model ListingCommute {
  id                 String   @id @default(uuid())
  listingId          String
  poiId              String
  driveTimeMinutes   Int?
  driveDistanceMiles Float?
  calculatedAt       DateTime @default(now())

  listing Listing         @relation(...)
  poi     PointOfInterest @relation(...)

  @@unique([listingId, poiId])
}

// Add to existing models:
// Region, Listing, Lake, PricingModel → searchId String
// Region: @@unique([searchId, slug])
```

Remove or deprecate `driveTimeMinutes` on `Listing`/`Region` once `ListingCommute` is live.
