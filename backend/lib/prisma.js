import { PrismaClient } from '@prisma/client';

/**
 * Cap Prisma's connection pool for a small Railway/Postgres deploy.
 * Avoids unbounded defaults stacking with the separate session `pg.Pool`.
 */
function databaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return raw;

  try {
    const url = new URL(raw);
    if (!url.searchParams.has('connection_limit')) {
      const limit = process.env.PRISMA_CONNECTION_LIMIT || '5';
      url.searchParams.set('connection_limit', limit);
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', process.env.PRISMA_POOL_TIMEOUT || '10');
    }
    return url.toString();
  } catch {
    return raw;
  }
}

const prisma = new PrismaClient({
  datasources: {
    db: { url: databaseUrl() },
  },
  // Never needed in API responses; serializeListing strips it anyway.
  // Refresh keeps existing DB value unless a scrape returns new raw data.
  omit: {
    listing: {
      rawScrapedData: true,
    },
  },
});

export default prisma;
