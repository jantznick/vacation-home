# North Woods Home Tracker — Complete Guide

Single reference for setup, configuration, features, API, and testing.

**Table of contents**

1. [Overview](#overview)
2. [Local setup](#local-setup)
3. [Production (Railway)](#production-railway)
4. [Environment variables](#environment-variables)
5. [Architecture](#architecture)
6. [Data model](#data-model)
7. [Using the app](#using-the-app)
8. [Data import (Zillow & DNR)](#data-import-zillow--dnr)
9. [Drive time, geocoding & maps](#drive-time-geocoding--maps)
10. [API reference](#api-reference)
11. [Troubleshooting](#troubleshooting)
12. [Roadmap](#roadmap)

---

## Overview

Private web app for tracking Wisconsin north woods vacation home research: regions, lakes, listings, comments, ML price estimates, price history, and maps.

| Layer | Tech |
|---|---|
| Backend | Node.js, Express, Prisma, PostgreSQL |
| Frontend | React, Vite, Tailwind CSS, Zustand, React Router, Leaflet |
| Auth | Email/password, session cookies in PostgreSQL |
| Maps | Google Maps APIs (geocode, drive time, directions) + Leaflet/OSM tiles |
| Hosting | Railway (production) |

**Repo layout**

```
vacation-home/
├── backend/          # Express API + Prisma
├── frontend/         # React SPA
├── docs/GUIDE.md     # This file
├── docker-compose.yml
└── README.md
```

**Current status:** MVP-ready for two-person research. Core flows work end-to-end; optional polish (listing comparison) can wait until you've used the app with real data.

---

## MVP checklist (before you rely on it daily)

Use this once before or right after deploying to Railway.

**Local smoke test**

- [ ] Register/login with test accounts
- [ ] Profile → save home address → map pin appears
- [ ] Create a region with center location → drive time + map route
- [ ] Import one listing via Zillow paste → photos, price, coords
- [ ] Listing detail → “Is this a good price?” (needs ≥3 priced listings for tabs)
- [ ] Map page shows home + region + listing pins
- [ ] Add a lake via DNR URL on a region page
- [ ] Leave a comment on a listing

**Production deploy**

- [ ] Railway Postgres + backend service (`npm start`)
- [ ] Frontend static deploy with `VITE_API_URL`
- [ ] `SESSION_SECRET` — strong random string, not dev default
- [ ] `FRONTEND_URL` on backend matches frontend origin exactly
- [ ] `GOOGLE_MAPS_API_KEY` set if using maps/drive time
- [ ] Run through login + one listing import on production URL

**Known limitations (by design)**

- Zillow updates = Refresh from Zillow on edit (ZillAPI) or re-paste in settings
- ML estimates need ≥3 priced listings per segment; noisy with very small samples
- Drive time is per-user home; cached on region/listing after you click calculate
- `showCompAnalysis` column exists in DB but is unused (legacy)

---

## Local setup

### Prerequisites

- Node.js 20+
- Docker (for local PostgreSQL)
- npm

### 1. Start the database

```bash
docker-compose up postgres -d
```

PostgreSQL on port 5432, database `vacation_home`.

### 2. Backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

- `DATABASE_URL` — match docker-compose defaults
- `GOOGLE_MAPS_API_KEY` — optional until you test maps/drive time

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Backend: http://localhost:3001

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173 (proxies `/api` to backend)

### 4. First use

1. Open http://localhost:5173 and **register** (any email)
2. **Create a search** (or open your migrated search)
3. **Search settings** — add points of interest (home, work, etc.) for drive times
4. Add a **region** with a center location (e.g. `Eagle River, WI`)
5. Add **lakes** (optional — DNR import on region page)
6. Add **listings** via Zillow paste import or manually
7. Visit **Pricing Models** once you have a few priced listings
8. **Invite** a collaborator via email (requires Resend env vars)

### Useful commands

| Command | Where | Purpose |
|---|---|---|
| `npm run dev` | backend / frontend | Dev servers |
| `npm run prisma:migrate` | backend | Apply dev migrations |
| `npm run prisma:studio` | backend | Visual DB browser |
| `npm run prisma:migrate:deploy` | backend | Apply migrations (prod) |
| `npm run parse:zillow -- file.json` | backend | Test Zillow parser |
| `npm run parse:dnr-lake -- a.html b.html` | backend | Test DNR parser |

---

## Production (Railway)

1. Create a Railway project with PostgreSQL
2. Deploy **backend** from `/backend`
   - Start: `npm start` (runs migrations then server)
   - Set env vars (see below)
3. Deploy **frontend** as static site from `/frontend`
   - Build: `npm run build`
   - `VITE_API_URL` = your backend URL + `/api`
4. Set `FRONTEND_URL` on the backend to your frontend URL

---

## Environment variables

### Backend

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Session cookie signing secret (`openssl rand -base64 32`) |
| `RESEND_API_KEY` | For invites + magic link | Resend API key |
| `RESEND_FROM_EMAIL` | For invites + magic link | Verified sender address |
| `GOOGLE_MAPS_API_KEY` | For maps/drive time | Enable Geocoding + Distance Matrix + Directions APIs |
| `FRONTEND_URL` | Yes (prod) | Frontend origin for CORS/cookies |
| `PORT` | No | Default `3001` |
| `NODE_ENV` | No | `development` or `production` |
| `COOKIE_DOMAIN` | No | Cross-subdomain cookies in production |
| `JSON_BODY_LIMIT` | No | Default `10mb` (Zillow paste import) |
| `ZILLAPI_KEY` | For URL import | ZillAPI bearer token (`zk_…`) — property + photos lookups |
| `ADMIN_EMAIL` | For admin page | Email of the user who can view `/admin` and ZillAPI call logs |
| `ZILLOW_FETCH_METHOD` | No | Legacy — unused by URL import; paste parser only |

Puppeteer vars (`PUPPETEER_*`) only matter if debugging server-side Zillow fetch.

**Local `backend/.env` example**

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vacation_home?schema=public"
SESSION_SECRET="change-this-in-development"
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
GOOGLE_MAPS_API_KEY=""
ZILLAPI_KEY=""
ADMIN_EMAIL="you@example.com"
```

### Frontend

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Prod only | Backend API base including `/api` |

Leave empty locally; Vite proxies to `http://localhost:3001`.

---

## Architecture

```
┌─────────────┐     session cookie      ┌─────────────┐
│   React     │ ◄──────────────────────►│   Express   │
│   SPA       │      REST /api          │   API       │
└─────────────┘                         └──────┬──────┘
                                               │
                                        ┌──────▼──────┐
                                        │ PostgreSQL  │
                                        └─────────────┘
```

**Auth:** Email/password or magic link (6-digit code + email link) → `connect.sid` cookie → session row in Postgres. Open registration. Magic link creates an account if the email is new. Production: `secure` cookies, `sameSite: none`, `trust proxy`. Requires `RESEND_*` for magic link in production.

**Domain concepts**

| Concept | Purpose |
|---|---|
| Region | Broad area with center location, drive time, pros/cons |
| Lake | Lake in a region (DNR import supported) |
| Listing | Property in a region; optional lake |
| Comment | Notes on region, lake, or listing |
| PricingModel | ML linear regression with per-segment weights |
| ListingSnapshot | Price/status history |

**Pricing:** `backend/services/pricing/` — segments `all`, `regions:{id}`, `similar:{listingId}`; auto-retrain on listing CRUD; ≥3 priced listings per segment to estimate.

**Maps:** `backend/services/maps/` — Google geocode + distance matrix + directions; Leaflet frontend with OSM tiles.

---

## Data model

Schema: `backend/prisma/schema.prisma`

```
Region 1──* Lake
Region 1──* Listing
Lake   0──* Listing
User   1──* Comment
```

**User:** `email`, `password`, `homeAddress/City/State/Zip`, `homeLat/Lng`

**Region:** `name`, `slug`, `centerAddress`, `latitude/longitude`, `driveTimeMinutes`, `driveDistanceMiles`, `status`, `pros/cons`, `overallScore`

**Listing:** `regionId`, `lakeId?`, address fields, `latitude/longitude`, `driveTimeMinutes`, `listPrice`, `isVacantLot`, `photoUrls`, `rawScrapedData`, etc.

**Enums:** Region status — `researching | shortlisted | ruled_out | purchased`. Listing status — `active | pending | sold | off_market | interested | passed`.

Derived on API responses: `pricePerAcre`, `pricePerSqft`.

---

## Using the app

| Page | Purpose |
|---|---|
| Dashboard | Stats, regions, recent listings, price drops |
| Regions | Research areas; add lakes and listings per region |
| Listings | Filter/sort all properties |
| Map | All geocoded pins + home |
| Pricing | Train ML models, pick features |
| Profile | Home address (drive-time origin) |

**Listing detail:** Photos at top → “Is this a good price?” (3 tabs) → overview → location + map with route → price history.

**Mobile:** Nav scrolls horizontally; page actions stack below titles; maps use responsive height.

---

## Data import (Zillow & DNR)

### Zillow listings (URL import — recommended)

Paste a Zillow listing URL on the Add listing form. The server fetches property details and photos via ZillAPI (two separate API calls). Requires `ZILLAPI_KEY` on the backend.

**Mobile:** In Zillow, tap Share → Copy Link → paste in the app.

**Update existing listing:** Edit listing → Refresh from Zillow.

**Advanced fallback:** Search settings → Advanced → Zillow browser paste (desktop only, no API credits).

**Test paste parser locally:** `cd backend && npm run parse:zillow -- data.json`

### WI DNR lakes

Region page → Add lake → paste DNR URL → Import. Edit lake → “Refresh from DNR on save” optional.

**Test:** `npm run parse:dnr-lake -- ../anvil.html ../anvil_facts.html`

| DNR field | Lake field |
|---|---|
| Name | `name` |
| Area | `acreage` |
| Maximum / Mean depth | `maxDepthFeet` / `avgDepthFeet` |
| Bottom | `edgeType` |
| Water clarity / trophic | `waterClarity` |

---

## Drive time, geocoding & maps

### Google Cloud setup

Enable on your API key:

| API | Purpose |
|---|---|
| Geocoding API | Addresses → lat/lng |
| Distance Matrix API | Drive minutes + miles |
| Directions API | Route line on Leaflet maps |

Add `GOOGLE_MAPS_API_KEY` to `backend/.env` and restart.

### Data flow

```
Profile save     → homeLat, homeLng
Region save      → latitude, longitude (from centerAddress)
Listing import   → lat/lng from Zillow, or geocode from address
Drive-time btn   → caches minutes/miles on region or listing
Map pages        → Leaflet pins + route line (home → destination)
```

**Pin colors:** green = home, blue = region, orange = listing.

### Test checklist

**A. Home (do first)**

1. Profile → enter address → Save
2. Expect: success message + home map below form
3. DB: `User.homeLat`, `homeLng` populated

**B. Region**

1. Edit region → set Center location → Save
2. Region detail → Look up location (if needed)
3. Calculate drive time from home
4. Expect: minutes/miles + map with route; dashboard shows `X min`

**C. Listing**

1. Import via Zillow paste or add address manually
2. Listing detail → Look up location → Calculate drive time
3. Expect: map with route from home

**D. Map overview**

1. Nav → Map
2. All pins visible; popups link to detail pages

### Maps UI locations

| Page | Map |
|---|---|
| Profile | Home pin |
| Region detail | Center + home + route |
| Listing detail | Property + home + route |
| Map (`/map`) | Everything |

### Location API (quick)

| Method | Endpoint |
|---|---|
| `PATCH` | `/api/auth/profile` |
| `POST` | `/api/regions/:id/geocode` |
| `POST` | `/api/regions/:id/drive-time` |
| `POST` | `/api/listings/:id/geocode` |
| `POST` | `/api/listings/:id/drive-time` |
| `GET` | `/api/maps/overview` |
| `GET` | `/api/maps/route?toLat=&toLng=` |

### Maps troubleshooting

| Symptom | Fix |
|---|---|
| `Google Maps is not configured` | Set `GOOGLE_MAPS_API_KEY` |
| `REQUEST_DENIED` | Enable all three APIs; check key restrictions |
| No home route | Save Profile with full address first |
| No route line | Enable **Directions API** (separate from Distance Matrix) |
| Empty map | Geocode location or Zillow paste for coords |

**Cost:** Google Maps has a free tier; two users researching dozens of properties should stay low.

---

## API reference

Base: `/api`. All routes except auth and health need session cookie.

### Auth

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | Body: `{ email, password }` |
| POST | `/auth/login` | Body: `{ email, password }` |
| POST | `/auth/magic-token/request` | Body: `{ email, intent? }` — `intent` is `login` or `register`; sends link + 6-digit code |
| POST | `/auth/magic-token/login` | Body: `{ token }` — 6-digit code or link token; signs in or creates account |
| POST | `/auth/logout` | |
| GET | `/auth/me` | Current user incl. home fields |
| PATCH | `/auth/profile` | Body: home address fields; auto-geocode |

### Regions

| Method | Path | Notes |
|---|---|---|
| GET | `/regions` | List with counts |
| GET | `/regions/:id` | With lakes and listings |
| POST | `/regions` | Body: `name`, `centerAddress`, `description`, `status`, etc. |
| PATCH | `/regions/:id` | Partial update |
| POST | `/regions/:id/geocode` | Look up center |
| POST | `/regions/:id/drive-time` | From user's home |
| DELETE | `/regions/:id` | Cascades lakes + listings |

### Lakes

| Method | Path | Notes |
|---|---|---|
| GET | `/lakes?regionId=` | Optional filter |
| GET/POST/PATCH/DELETE | `/lakes/:id` | Standard CRUD |

### Listings

| Method | Path | Notes |
|---|---|---|
| GET | `/listings` | Filters: `regionId`, `lakeId`, `status`, `isVacantLot`, `waterfront`, `sortBy`, `sortDir` |
| GET | `/listings/:id` | |
| GET | `/listings/:id/snapshots` | Price history |
| GET | `/listings/:id/price-estimate` | ML estimate; `?modelId=` optional |
| POST | `/listings/:id/geocode` | |
| POST | `/listings/:id/drive-time` | |
| POST | `/listings` | Required: `regionId`. Optional: `rawScrapedData` |
| PATCH | `/listings/:id` | Price/status change creates snapshot |
| DELETE | `/listings/:id` | |

### Comments

| Method | Path | Notes |
|---|---|---|
| GET | `/comments?targetType=&targetId=` | |
| POST | `/comments` | Body: `{ targetType, targetId, body }` |
| DELETE | `/comments/:id` | Author only |

### Ingestion

| Method | Path | Notes |
|---|---|---|
| POST | `/ingest/preview` | **Zillow URL import** via ZillAPI (recommended) |
| POST | `/ingest/preview-paste` | Zillow browser paste (advanced fallback) |
| POST | `/ingest/dnr-lake/preview` | DNR URL or `wbic` |
| POST | `/ingest/dnr-lake/preview-paste` | Pasted DNR HTML |

### Analysis & pricing

| Method | Path | Notes |
|---|---|---|
| GET | `/analysis/price-drops` | Recent decreases from snapshots |
| GET | `/pricing-models/features` | Feature catalog |
| GET/POST/PATCH/DELETE | `/pricing-models` | CRUD |
| POST | `/pricing-models/:id/train` | Re-fit all segments |
| POST | `/pricing-models/:id/predict` | Debug predict |

### Maps

| Method | Path | Notes |
|---|---|---|
| GET | `/maps/overview` | Home + geocoded regions/listings |
| GET | `/maps/route?toLat=&toLng=` | Route polyline for Leaflet |

### Health

`GET /health` → `{ status, environment, date }`

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Email already registered | Use login or a different email |
| Session not persisting | `SESSION_SECRET` set; `FRONTEND_URL` matches frontend origin |
| DB connection failed | `docker-compose up postgres -d`; check `DATABASE_URL` |
| Zillow import fails | Check `ZILLAPI_KEY`; try Advanced paste in settings |

### Admin

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/ingest-calls` | ZillAPI call log (admin only; `ADMIN_EMAIL`) |
| Pricing tabs empty | Need ≥3 priced listings in that segment |
| Photos missing | Re-paste Zillow JSON on edit |

---

## Roadmap

### MVP (shipped)

- Auth, regions, lakes, listings, comments
- Zillow paste import, DNR lakes, photos, price snapshots
- ML pricing (“Is this a good price?”), price drops, listing sort
- Profile + home address, drive time, Leaflet maps

### SaaS (shipped)

Multi-user **searches** (shared workspaces), **points of interest**, email **invites** (Resend), search-scoped data isolation.

See **[SAAS_IMPLEMENTATION.md](./SAAS_IMPLEMENTATION.md)** for locked decisions and architecture. Planning doc: [SAAS_EXPANSION_PLAN.md](./SAAS_EXPANSION_PLAN.md).

### Next implementation (when you want it)

1. **Side-by-side listing comparison** — pick 2–4 shortlisted listings; compare price, acres, drive time, lake, photos, and your notes in one view. Best payoff after you have 5–10 listings saved.
2. **Zillow refresh UX** — dedicated “paste updated JSON” section on listing edit (same parser, clearer workflow than full form re-import).
3. **Bulk drive time** — one button to recalculate all regions/listings after POI changes

### Deferred

- CSV export
- Email alerts on price drops
- Additional listing sources / paid APIs

---