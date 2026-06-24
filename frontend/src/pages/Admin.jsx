import { useEffect, useState } from 'react';
import { adminAPI } from '../api/api';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';

function formatTime(value) {
  return new Date(value).toLocaleString();
}

function truncateUrl(url) {
  if (!url) return '—';
  if (url.length <= 48) return url;
  return `${url.slice(0, 45)}…`;
}

export default function Admin() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 100;

  const load = async (nextOffset = offset) => {
    setLoading(true);
    setError('');

    try {
      const result = await adminAPI.ingestCalls({ limit, offset: nextOffset });
      setData(result);
      setOffset(nextOffset);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(0);
  }, []);

  const summary = data?.summary;
  const calls = data?.calls ?? [];
  const hasPrev = offset > 0;
  const hasNext = data ? offset + limit < data.total : false;

  return (
    <div>
      <PageHeader
        title="Admin"
        description="ZillAPI import call log. Failed calls are tracked but not billed."
      />

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {summary && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-xs text-pine-500">Calls this month</p>
            <p className="mt-1 text-2xl font-semibold text-pine-900">{summary.totalCalls}</p>
          </Card>
          <Card>
            <p className="text-xs text-pine-500">Billed credits (2xx)</p>
            <p className="mt-1 text-2xl font-semibold text-pine-900">{summary.billedCalls}</p>
          </Card>
          <Card>
            <p className="text-xs text-pine-500">Failed (not billed)</p>
            <p className="mt-1 text-2xl font-semibold text-pine-900">{summary.failedCalls}</p>
          </Card>
        </div>
      )}

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-pine-900">ZillAPI calls</h2>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={loading || !hasPrev}
              onClick={() => load(offset - limit)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={loading || !hasNext}
              onClick={() => load(offset + limit)}
            >
              Next
            </Button>
          </div>
        </div>

        {loading && !data ? (
          <p className="text-sm text-pine-600">Loading calls...</p>
        ) : calls.length === 0 ? (
          <p className="text-sm text-pine-600">No API calls logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-pine-200 text-xs uppercase tracking-wide text-pine-500">
                  <th className="px-2 py-2 font-medium">Time</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Endpoint</th>
                  <th className="px-2 py-2 font-medium">HTTP</th>
                  <th className="px-2 py-2 font-medium">Billed</th>
                  <th className="px-2 py-2 font-medium">Search</th>
                  <th className="px-2 py-2 font-medium">User</th>
                  <th className="px-2 py-2 font-medium">ZPID</th>
                  <th className="px-2 py-2 font-medium">Source URL</th>
                  <th className="px-2 py-2 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => (
                  <tr key={call.id} className="border-b border-pine-100 align-top">
                    <td className="whitespace-nowrap px-2 py-2 text-pine-700">
                      {formatTime(call.createdAt)}
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                          call.success
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {call.success ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-pine-800">{call.endpoint}</td>
                    <td className="px-2 py-2 text-pine-700">{call.httpStatus ?? '—'}</td>
                    <td className="px-2 py-2 text-pine-700">{call.creditsCharged ? 'Yes' : 'No'}</td>
                    <td className="px-2 py-2 text-pine-700">{call.searchName || '—'}</td>
                    <td className="px-2 py-2 text-pine-700">{call.userEmail || '—'}</td>
                    <td className="px-2 py-2 text-pine-700">{call.zpid || '—'}</td>
                    <td className="max-w-[12rem] px-2 py-2 text-pine-700">
                      {call.sourceUrl ? (
                        <a
                          href={call.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-pine-800 underline decoration-pine-300 hover:text-pine-900"
                          title={call.sourceUrl}
                        >
                          {truncateUrl(call.sourceUrl)}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="max-w-[14rem] px-2 py-2 text-pine-700">
                      {[call.errorCode, call.errorMessage].filter(Boolean).join(': ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && (
          <p className="mt-4 text-xs text-pine-500">
            Showing {offset + 1}–{Math.min(offset + limit, data.total)} of {data.total} total calls
            {data.periodStart ? ` · Month stats since ${formatTime(data.periodStart)}` : ''}
          </p>
        )}
      </Card>
    </div>
  );
}
