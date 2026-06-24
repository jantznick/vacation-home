const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const authAPI = {
  register: (email, password) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  requestMagicToken: (email, intent = 'login') =>
    request('/auth/magic-token/request', {
      method: 'POST',
      body: JSON.stringify({ email, intent }),
    }),
  loginWithMagicToken: (token) =>
    request('/auth/magic-token/login', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
};

export const searchesAPI = {
  list: () => request('/searches'),
  create: (data) => request('/searches', { method: 'POST', body: JSON.stringify(data) }),
  get: (searchId) => request(`/searches/${searchId}`),
  update: (searchId, data) =>
    request(`/searches/${searchId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (searchId) => request(`/searches/${searchId}`, { method: 'DELETE' }),
  members: (searchId) => request(`/searches/${searchId}/members`),
  cancelInvite: (searchId, inviteId) =>
    request(`/searches/${searchId}/invites/${inviteId}`, { method: 'DELETE' }),
  resendInvite: (searchId, inviteId) =>
    request(`/searches/${searchId}/invites/${inviteId}/resend`, { method: 'POST' }),
  invites: (searchId) => request(`/searches/${searchId}/invites`),
  createInvite: (searchId, data) =>
    request(`/searches/${searchId}/invites`, { method: 'POST', body: JSON.stringify(data) }),
  removeMember: (searchId, userId) =>
    request(`/searches/${searchId}/members/${userId}`, { method: 'DELETE' }),
  updateMemberRole: (searchId, userId, role) =>
    request(`/searches/${searchId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  getInvite: (token) => request(`/searches/invites/${token}`),
  acceptInvite: (token) =>
    request('/searches/invites/accept', { method: 'POST', body: JSON.stringify({ token }) }),
};

export const adminAPI = {
  ingestCalls: ({ limit = 100, offset = 0, provider = 'zillapi' } = {}) => {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      provider,
    });
    return request(`/admin/ingest-calls?${params}`);
  },
};

export function createSearchAPI(searchId) {
  const base = `/searches/${searchId}`;

  return {
    pois: {
      list: () => request(`${base}/pois`),
      create: (data) => request(`${base}/pois`, { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) =>
        request(`${base}/pois/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      remove: (id) => request(`${base}/pois/${id}`, { method: 'DELETE' }),
      geocode: (id) => request(`${base}/pois/${id}/geocode`, { method: 'POST' }),
    },
    regions: {
      list: () => request(`${base}/regions`),
      get: (id) => request(`${base}/regions/${id}`),
      create: (data) => request(`${base}/regions`, { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) =>
        request(`${base}/regions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      remove: (id) => request(`${base}/regions/${id}`, { method: 'DELETE' }),
      geocode: (id) => request(`${base}/regions/${id}/geocode`, { method: 'POST' }),
      driveTime: (id) => request(`${base}/regions/${id}/drive-time`, { method: 'POST' }),
    },
    lakes: {
      list: (regionId) => {
        const query = regionId ? `?regionId=${regionId}` : '';
        return request(`${base}/lakes${query}`);
      },
      get: (id) => request(`${base}/lakes/${id}`),
      create: (data) => request(`${base}/lakes`, { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) =>
        request(`${base}/lakes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      remove: (id) => request(`${base}/lakes/${id}`, { method: 'DELETE' }),
    },
    listings: {
      list: (filters = {}) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            params.set(key, value);
          }
        });
        const query = params.toString();
        return request(`${base}/listings${query ? `?${query}` : ''}`);
      },
      get: (id) => request(`${base}/listings/${id}`),
      create: (data) => request(`${base}/listings`, { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) =>
        request(`${base}/listings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      remove: (id) => request(`${base}/listings/${id}`, { method: 'DELETE' }),
      snapshots: (id) => request(`${base}/listings/${id}/snapshots`),
      commutes: (id) => request(`${base}/listings/${id}/commutes`),
      priceEstimate: (id, modelId) => {
        const query = modelId ? `?modelId=${modelId}` : '';
        return request(`${base}/listings/${id}/price-estimate${query}`);
      },
      geocode: (id) => request(`${base}/listings/${id}/geocode`, { method: 'POST' }),
      driveTime: (id) => request(`${base}/listings/${id}/drive-time`, { method: 'POST' }),
    },
    analysis: {
      priceDrops: () => request(`${base}/analysis/price-drops`),
    },
    pricingModels: {
      features: () => request(`${base}/pricing-models/features`),
      list: () => request(`${base}/pricing-models`),
      get: (id) => request(`${base}/pricing-models/${id}`),
      create: (data) =>
        request(`${base}/pricing-models`, { method: 'POST', body: JSON.stringify(data) }),
      update: (id, data) =>
        request(`${base}/pricing-models/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      remove: (id) => request(`${base}/pricing-models/${id}`, { method: 'DELETE' }),
      train: (id) => request(`${base}/pricing-models/${id}/train`, { method: 'POST' }),
      predict: (id, listingId) =>
        request(`${base}/pricing-models/${id}/predict`, {
          method: 'POST',
          body: JSON.stringify({ listingId }),
        }),
    },
    ingest: {
      preview: (url) =>
        request(`${base}/ingest/preview`, {
          method: 'POST',
          body: JSON.stringify({ url }),
        }),
      previewPaste: (url, pastedData) =>
        request(`${base}/ingest/preview-paste`, {
          method: 'POST',
          body: JSON.stringify({ url, pastedData }),
        }),
      previewDnrLake: (url) =>
        request(`${base}/ingest/dnr-lake/preview`, {
          method: 'POST',
          body: JSON.stringify({ url }),
        }),
      previewDnrLakePaste: ({ wbic, overviewHtml, factsHtml }) =>
        request(`${base}/ingest/dnr-lake/preview-paste`, {
          method: 'POST',
          body: JSON.stringify({ wbic, overviewHtml, factsHtml }),
        }),
    },
    maps: {
      overview: () => request(`${base}/maps/overview`),
      route: (toLat, toLng, poiId) => {
        const params = new URLSearchParams({ toLat, toLng });
        if (poiId) params.set('poiId', poiId);
        return request(`${base}/maps/route?${params}`);
      },
    },
    comments: {
      list: (targetType, targetId) =>
        request(`${base}/comments?targetType=${targetType}&targetId=${targetId}`),
      create: (data) => request(`${base}/comments`, { method: 'POST', body: JSON.stringify(data) }),
      remove: (id) => request(`${base}/comments/${id}`, { method: 'DELETE' }),
    },
  };
}
