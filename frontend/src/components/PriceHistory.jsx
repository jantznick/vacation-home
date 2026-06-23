import Card from './Card';
import { formatCurrency } from '../lib/format';

export default function PriceHistory({ snapshots }) {
  if (!snapshots.length) {
    return (
      <Card>
        <h2 className="text-lg font-medium text-pine-900">Price history</h2>
        <p className="mt-2 text-sm text-pine-600">No price history yet. Edit the list price to start tracking changes.</p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-lg font-medium text-pine-900">Price history</h2>
      <ul className="mt-4 space-y-2">
        {snapshots.map((snapshot) => (
          <li
            key={snapshot.id}
            className="flex items-center justify-between rounded-md border border-pine-200 px-3 py-2 text-sm"
          >
            <span className="text-pine-600">
              {new Date(snapshot.capturedAt).toLocaleString()}
            </span>
            <span className="font-medium text-pine-900">
              {formatCurrency(snapshot.listPrice)}
              {snapshot.status && (
                <span className="ml-2 text-xs font-normal text-pine-500">{snapshot.status}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
