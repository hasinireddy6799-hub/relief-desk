import { useEffect, useState, useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/dexie';
import { supabase, parsePoint } from '@/lib/supabase';
import { Incident, IncidentType, IncidentStatus } from '@/types/database';
import { useOnlineStatus } from './useOnlineStatus';

export interface IncidentFilters {
  type: IncidentType | 'all';
  severity: number | 'all';
  status: IncidentStatus | 'open' | 'all';
  searchQuery: string;
}

export function useIncidents(userCoords?: { lng: number; lat: number }) {
  const isOnline = useOnlineStatus();
  const [isFetchingServer, setIsFetchingServer] = useState(false);
  const [filters, setFilters] = useState<IncidentFilters>({
    type: 'all',
    severity: 'all',
    status: 'open',
    searchQuery: '',
  });

  // 1. Reactive query from Dexie local database
  const cachedIncidents = useLiveQuery(
    () => db.incidents.filter((inc) => !inc.deleted_at).toArray(),
    []
  ) ?? [];

  // 2. Fetch from Supabase and sync to Dexie
  const syncServerIncidents = useCallback(async () => {
    if (!isOnline) return;
    setIsFetchingServer(true);

    try {
      let remoteIncidents: Incident[] = [];

      // Check low-data mode preference
      const isLowData = localStorage.getItem('relief_desk_low_data') === 'true';
      const radiusM = isLowData ? 2500 : 10000;

      if (userCoords) {
        // Attempt nearby_incidents RPC
        const { data: rpcData, error: rpcError } = await supabase.rpc('nearby_incidents', {
          p_lng: userCoords.lng,
          p_lat: userCoords.lat,
          p_radius_m: radiusM,
        });

        if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
          remoteIncidents = rpcData.map((row: any) => ({
            id: row.id,
            client_id: row.id,
            type: row.type,
            severity: row.severity,
            status: row.status,
            description: null,
            address_label: null,
            people_affected: 0,
            location: `SRID=4326;POINT(${row.lng} ${row.lat})`,
            is_sos: row.type === 'Emergency SOS',
            confirmations: row.confirmations || 1,
            duplicate_of: null,
            reported_by: null,
            assigned_to: null,
            created_at: row.created_at,
            updated_at: row.created_at,
            resolved_at: null,
            deleted_at: null,
            lng: row.lng,
            lat: row.lat,
            distance_m: row.distance_m,
          }));
        }
      }

      // If RPC didn't return or user has no coords, fallback to standard table query
      if (remoteIncidents.length === 0) {
        const { data, error } = await supabase
          .from('incidents')
          .select('*')
          .is('deleted_at', null)
          .order('severity', { ascending: false })
          .limit(100);

        if (!error && Array.isArray(data)) {
          remoteIncidents = data.map((row: any) => {
            const parsed = parsePoint(row.location);
            return {
              ...row,
              lng: parsed?.lng,
              lat: parsed?.lat,
            } as Incident;
          });
        }
      }

      if (remoteIncidents.length > 0) {
        await db.incidents.bulkPut(remoteIncidents);
      }
    } catch (err) {
      console.warn('Notice syncing incidents with server:', err);
    } finally {
      setIsFetchingServer(false);
    }
  }, [isOnline, userCoords]);

  // Initial sync and when user coordinates become available
  useEffect(() => {
    syncServerIncidents();
  }, [syncServerIncidents]);

  // 3. Supabase Realtime subscription
  useEffect(() => {
    if (!isOnline) return;

    const channel = supabase
      .channel('realtime:incidents')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as any;
            const parsed = parsePoint(row.location);
            const item: Incident = {
              ...row,
              lng: parsed?.lng,
              lat: parsed?.lat,
            };
            await db.incidents.put(item);
          } else if (payload.eventType === 'DELETE') {
            await db.incidents.delete(payload.old.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOnline]);

  // 4. Calculate distances and apply filters
  const filteredIncidents = useMemo(() => {
    return cachedIncidents
      .map((inc) => {
        let distance_m = inc.distance_m;
        if (
          userCoords &&
          typeof inc.lng === 'number' &&
          typeof inc.lat === 'number' &&
          distance_m === undefined
        ) {
          // Calculate Haversine distance in meters
          const R = 6371e3;
          const φ1 = (userCoords.lat * Math.PI) / 180;
          const φ2 = (inc.lat * Math.PI) / 180;
          const Δφ = ((inc.lat - userCoords.lat) * Math.PI) / 180;
          const Δλ = ((inc.lng - userCoords.lng) * Math.PI) / 180;
          const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distance_m = Math.round(R * c);
        }
        return { ...inc, distance_m };
      })
      .filter((inc) => {
        // Status filter
        if (filters.status === 'open' && inc.status === 'resolved') {
          return false;
        }
        if (filters.status !== 'all' && filters.status !== 'open' && inc.status !== filters.status) {
          return false;
        }

        // Type filter
        if (filters.type !== 'all' && inc.type !== filters.type) {
          return false;
        }

        // Severity filter
        if (filters.severity !== 'all' && inc.severity !== filters.severity) {
          return false;
        }

        // Search query
        if (filters.searchQuery.trim()) {
          const q = filters.searchQuery.toLowerCase();
          const matchType = inc.type.toLowerCase().includes(q);
          const matchDesc = (inc.description || '').toLowerCase().includes(q);
          const matchAddr = (inc.address_label || '').toLowerCase().includes(q);
          if (!matchType && !matchDesc && !matchAddr) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // Critical and SOS incidents first, then higher confirmations, then recent
        if (b.severity !== a.severity) {
          return b.severity - a.severity;
        }
        if (b.confirmations !== a.confirmations) {
          return b.confirmations - a.confirmations;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [cachedIncidents, userCoords, filters]);

  return {
    incidents: filteredIncidents,
    totalCount: cachedIncidents.length,
    isFetchingServer,
    filters,
    setFilters,
    refetch: syncServerIncidents,
  };
}
