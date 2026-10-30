import { useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/dexie';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { refreshSupplies, SupplyRow } from '@/services/supplyService';

export function useSupplies() {
  const isOnline = useOnlineStatus();

  const supplies = (useLiveQuery(() => db.supplies.toArray(), []) ??
    []) as unknown as SupplyRow[];

  const refresh = useCallback(async () => {
    if (!navigator.onLine) return;
    await refreshSupplies();
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, isOnline]);

  useEffect(() => {
    window.addEventListener('relief-desk-synced', refresh);
    return () => window.removeEventListener('relief-desk-synced', refresh);
  }, [refresh]);

  return { supplies };
}
