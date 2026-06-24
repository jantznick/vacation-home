import prisma from '../../lib/prisma.js';

/**
 * Log a third-party ingest API call. ZillAPI only bills successful (2xx) responses;
 * we still log failures so usage can be audited and duplicate retries avoided.
 */
export async function logIngestApiCall({
  searchId = null,
  userId = null,
  provider,
  endpoint,
  success,
  httpStatus = null,
  creditsCharged = false,
  errorCode = null,
  errorMessage = null,
  sourceUrl = null,
  zpid = null,
  requestId = null,
}) {
  try {
    await prisma.ingestApiCall.create({
      data: {
        searchId,
        userId,
        provider,
        endpoint,
        success,
        httpStatus,
        creditsCharged,
        errorCode,
        errorMessage,
        sourceUrl,
        zpid,
        requestId,
      },
    });
  } catch (error) {
    console.error('Failed to log ingest API call:', error);
  }
}

function startOfUtcMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

const callSelect = {
  id: true,
  searchId: true,
  userId: true,
  provider: true,
  endpoint: true,
  success: true,
  httpStatus: true,
  creditsCharged: true,
  errorCode: true,
  errorMessage: true,
  sourceUrl: true,
  zpid: true,
  requestId: true,
  createdAt: true,
};

export async function listIngestApiCalls({
  provider = 'zillapi',
  limit = 100,
  offset = 0,
} = {}) {
  const where = { provider };
  const since = startOfUtcMonth();

  const [total, monthTotal, monthBilled, monthFailed, calls] = await Promise.all([
    prisma.ingestApiCall.count({ where }),
    prisma.ingestApiCall.count({ where: { ...where, createdAt: { gte: since } } }),
    prisma.ingestApiCall.count({
      where: { ...where, createdAt: { gte: since }, creditsCharged: true },
    }),
    prisma.ingestApiCall.count({
      where: { ...where, createdAt: { gte: since }, success: false },
    }),
    prisma.ingestApiCall.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: callSelect,
    }),
  ]);

  const userIds = [...new Set(calls.map((call) => call.userId).filter(Boolean))];
  const searchIds = [...new Set(calls.map((call) => call.searchId).filter(Boolean))];

  const [users, searches] = await Promise.all([
    userIds.length
      ? prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true },
      })
      : [],
    searchIds.length
      ? prisma.search.findMany({
        where: { id: { in: searchIds } },
        select: { id: true, name: true },
      })
      : [],
  ]);

  const userById = Object.fromEntries(users.map((user) => [user.id, user.email]));
  const searchById = Object.fromEntries(searches.map((search) => [search.id, search.name]));

  return {
    provider,
    periodStart: since.toISOString(),
    summary: {
      totalCalls: monthTotal,
      billedCalls: monthBilled,
      failedCalls: monthFailed,
    },
    total,
    limit,
    offset,
    calls: calls.map((call) => ({
      ...call,
      userEmail: call.userId ? userById[call.userId] ?? null : null,
      searchName: call.searchId ? searchById[call.searchId] ?? null : null,
    })),
  };
}
