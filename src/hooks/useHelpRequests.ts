import { useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/dexie';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { refreshHelpRequests, HelpRow } from '@/services/helpService';

export function useHelpRequests() {
  const isOnline = useOnlineStatus();

  const requests = (useLiveQuery(() => db.help_requests.toArray(), []) ??
    []) as unknown as HelpRow[];

  const refresh = useCallback(async () => {
    if (!navigator.onLine) return;
    await refreshHelpRequests();
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, isOnline]);

  useEffect(() => {
    window.addEventListener('relief-desk-synced', refresh);
    return () => window.removeEventListener('relief-desk-synced', refresh);
  }, [refresh]);

  return { requests };
}
