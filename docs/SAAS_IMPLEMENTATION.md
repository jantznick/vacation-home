# SaaS implementation spec (locked)

My Vacation Home Search — multi-user vacation home search platform.

**Status:** Phases 1–3 complete; pre-launch polish in progress  
**Prior plan:** [SAAS_EXPANSION_PLAN.md](./SAAS_EXPANSION_PLAN.md)  
**No backwards-compat required** — local dev only; breaking changes are fine.

---

## Product decisions (locked)

| # | Decision |
|---|----------|
| 1 | Workspace name: **Search** |
| 2 | Single product; vacation-home focus |
| 3 | **Lakes** stay as first-class entities |
| 4 | Sharing: **email invite** via **Resend** |
| 5 | **Zillow paste** stays; licensed API later |
| 6 | **Primary POI** on listing cards; **full commute list** on listing detail |
| 7 | Vertical: vacation / second home; portfolio + personal deployment |

### Roles

| Role | Permissions |
|------|-------------|
| `owner` | Full access, delete search, manage members, transfer ownership |
| `editor` | CRUD regions, lakes, listings, POIs, comments |
| `viewer` | Read-only |

### Registration

- **Open registration** — any valid email can sign up

---

## Architecture

### URL structure

```
/api/auth/*                           — account (global)
/api/searches                         — list / create searches
/api/searches/invites/:token          — public invite preview
/api/searches/invites/accept          — accept invite token
/api/searches/:searchId/*             — all search-scoped data
```

```
/searches                             — pick or create a search
/searches/:searchId                   — dashboard
/searches/:searchId/regions|listings|map|pricing|settings
/invites/:token                       — accept invite landing
/profile                              — account (email, password)
```

### Data model

```
User ──< SearchMember >── Search
                              ├── PointOfInterest
                              ├── Region ── Lake
                              │              └── Listing ── ListingCommute → POI
                              ├── PricingModel
                              └── SearchInvite
```

- `Region.slug` unique per **search** (`@@unique([searchId, slug])`)
- `Search.slug` globally unique (for URLs)
- `Listing.driveTimeMinutes` = cached value from **primary POI** commute (sorting + cards)
- `ListingCommute` stores per-(listing, POI) drive times

### POI types

`current_home` | `work` | `school` | `family` | `other`

Exactly one POI per search may be `isPrimary` (default commute anchor).

### Drive time

- Recalculate listing: compute all POIs → `ListingCommute` rows; sync primary to `listing.driveTimeMinutes`
- Recalculate region: from primary POI to region center
- Maps overview: all POIs + regions + listings for the search

### Invites (Resend)

1. Owner sends invite → `SearchInvite` row + email with `${FRONTEND_URL}/invites/:token`
2. Recipient registers/logs in → accepts token → `SearchMember` created
3. Invites expire after 7 days

### Members

- Owner can **remove** members (not self, not other owners)
- Owner can **change roles** (editor ↔ viewer)
- Owner can **transfer ownership** (promotes member to owner; current owner becomes editor)

---

## Implementation phases

### Phase 1 — Schema + search scoping ✅

- Prisma models: `Search`, `SearchMember`, `SearchInvite`, `PointOfInterest`, `ListingCommute`
- `searchId` on `Region`, `Listing`, `PricingModel`
- `requireSearchMember` middleware
- Nest all resource routes under `/api/searches/:searchId`
- Open registration
- Data migration → default search

### Phase 2 — POIs + commute ✅

- POI CRUD + geocode
- `ListingCommute` computation
- Listing detail commute list UI
- Profile stripped to account-only (POI link in settings)
- **TODO:** drive time badge on listing cards
- **TODO:** remove `User.home*` from profile API

### Phase 3 — Sharing ✅

- Resend invite emails
- Members management UI (invite, cancel, resend, remove, role change, transfer ownership)
- Accept-invite page
- **TODO:** viewer role hides edit UI app-wide

### Phase 4 — Frontend routing ✅

- Search list / create / switcher
- All pages under `/searches/:searchId`
- Settings page (POIs + members)

### Phase 5 — Deploy prep

- Env docs: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- Security review (search isolation tests)
- Production deploy
- GUIDE.md updated for multi-user flow

---

## Environment variables (new)

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | For invites | Resend API key |
| `RESEND_FROM_EMAIL` | For invites | Verified sender, e.g. `onboarding@yourdomain.com` |

---

## Security checklist

- [ ] Every search-scoped query includes `searchId` from URL, not client body
- [x] `requireSearchMember` on all `/:searchId/*` routes
- [x] Editor/viewer enforced on mutations (backend)
- [ ] Viewer read-only enforced in UI
- [x] Invite tokens are opaque UUIDs, expire, single-use
- [ ] No cross-search IDOR on region/listing UUIDs (manual QA only; no automated tests)

---

## Out of scope (for now)

- Billing / Stripe
- MLS or paid listing APIs
- Relocation / city-move positioning
- Bulk drive-time recalc across all listings
- CSV export, email price alerts
