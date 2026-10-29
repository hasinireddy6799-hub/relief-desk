import { useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/dexie';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { refreshShelters, refreshCheckins, ShelterRow, CheckinRow } from '@/services/shelterService';

export function useShelters(isResponder: boolean) {
  const isOnline = useOnlineStatus();

  const shelters = (useLiveQuery(() => db.shelters.orderBy('name').toArray(), []) ??
    []) as unknown as ShelterRow[];
  const checkins = (useLiveQuery(
    () => db.shelter_checkins.filter((c) => !c.checked_out_at).toArray(),
    []
  ) ?? []) as CheckinRow[];

  const refresh = useCallback(async () => {
    if (!navigator.onLine) return;
    await refreshShelters();
    if (isResponder) await refreshCheckins();
  }, [isResponder]);

  useEffect(() => {
    refresh();
  }, [refresh, isOnline]);

  useEffect(() => {
    window.addEventListener('relief-desk-synced', refresh);
    return () => window.removeEventListener('relief-desk-synced', refresh);
  }, [refresh]);

  return { shelters, checkins };
}
