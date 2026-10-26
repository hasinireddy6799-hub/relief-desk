import { useLiveQuery } from 'dexie-react-hooks';
import { db, OutboxItem } from '@/db/dexie';

export interface OutboxState {
  queuedCount: number;
  failedCount: number;
  isSyncing: boolean;
  pendingItems: OutboxItem[];
  failedItems: OutboxItem[];
}

export function useOutbox(): OutboxState {
  const pendingItems = useLiveQuery(
    () => db.outbox.filter((item) => item.status === 'pending' || item.status === 'syncing').toArray(),
    []
  ) ?? [];

  const failedItems = useLiveQuery(
    () => db.outbox.filter((item) => item.status === 'failed').toArray(),
    []
  ) ?? [];

  const isSyncing = pendingItems.some((item) => item.status === 'syncing');

  return {
    queuedCount: pendingItems.length,
    failedCount: failedItems.length,
    isSyncing,
    pendingItems,
    failedItems,
  };
}
