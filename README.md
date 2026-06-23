# My Vacation Home Search

A web app for tracking vacation home research: regions, lakes, listings, ML price estimates, maps, and drive time. Live at [myvacationhomesearch.com](https://myvacationhomesearch.com).

Built for a two-person household researching properties over 6–12 months before purchase.

## Quick start

```bash
docker-compose up postgres -d
cd backend && cp .env.example .env && npm install && npm run prisma:migrate && npm run dev
cd frontend && npm install && npm run dev
```

Open http://localhost:5173 — create an account to get started.

## Documentation

**Everything is in one place:** [docs/GUIDE.md](docs/GUIDE.md)

Setup, env vars, architecture, data model, Zillow/DNR import, drive time & maps testing, API reference, troubleshooting, and roadmap.

**Planning:** [SaaS expansion plan](docs/SAAS_EXPANSION_PLAN.md) — multi-user searches, POIs, sharing.

## Stack

Node.js · Express · Prisma · PostgreSQL · React · Vite · Tailwind · Leaflet · Google Maps APIs
