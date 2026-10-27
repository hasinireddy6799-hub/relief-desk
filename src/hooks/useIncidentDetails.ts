import { useEffect, useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/dexie';
import { supabase } from '@/lib/supabase';
import { IncidentUpdate, IncidentMedia } from '@/types/database';
import { useOnlineStatus } from './useOnlineStatus';

export function useIncidentDetails(incidentId?: string | null) {
  const isOnline = useOnlineStatus();
  const [isFetchingRemote, setIsFetchingRemote] = useState(false);

  // 1. Live query for incident updates from Dexie
  const localUpdates = useLiveQuery(
    async () => {
      if (!incidentId) return [];
      return db.incident_updates
        .where('incident_id')
        .equals(incidentId)
        .sortBy('created_at');
    },
    [incidentId]
  ) ?? [];

  // 2. Live query for media photos from Dexie
  const localMedia = useLiveQuery(
    async () => {
      if (!incidentId) return [];
      return db.incident_media
        .where('incident_id')
        .equals(incidentId)
        .sortBy('created_at');
    },
    [incidentId]
  ) ?? [];

  // 3. Fetch remote updates and media from Supabase when online
  const fetchRemoteData = useCallback(async () => {
    if (!incidentId || !isOnline) return;
    setIsFetchingRemote(true);

    try {
      // Fetch updates
      const { data: remoteUpdates, error: updateErr } = await supabase
        .from('incident_updates')
        .select('*')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: true });

      if (!updateErr && Array.isArray(remoteUpdates) && remoteUpdates.length > 0) {
        await db.incident_updates.bulkPut(remoteUpdates);
      }

      // Fetch media
      const { data: remoteMedia, error: mediaErr } = await supabase
        .from('incident_media')
        .select('*')
        .eq('incident_id', incidentId);

      if (!mediaErr && Array.isArray(remoteMedia) && remoteMedia.length > 0) {
        // Prepare signed URLs if possible
        const mediaWithUrls = await Promise.all(
          remoteMedia.map(async (item: IncidentMedia) => {
            try {
              const { data: signed } = await supabase.storage
                .from('incident-photos')
                .createSignedUrl(item.storage_path, 3600);
              return {
                ...item,
                signed_url: signed?.signedUrl,
              };
            } catch {
              return item;
            }
          })
        );
        await db.incident_media.bulkPut(mediaWithUrls);
      }
    } catch (err) {
      console.warn('Notice fetching incident timeline details:', err);
    } finally {
      setIsFetchingRemote(false);
    }
  }, [incidentId, isOnline]);

  useEffect(() => {
    fetchRemoteData();
  }, [fetchRemoteData]);

  // 4. Realtime subscription for incident updates
  useEffect(() => {
    if (!incidentId || !isOnline) return;

    const channel = supabase
      .channel(`incident_details_${incidentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incident_updates',
          filter: `incident_id=eq.${incidentId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            await db.incident_updates.put(payload.new as IncidentUpdate);
          } else if (payload.eventType === 'DELETE') {
            await db.incident_updates.delete((payload.old as any).id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incident_media',
          filter: `incident_id=eq.${incidentId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as IncidentMedia;
            try {
              const { data: signed } = await supabase.storage
                .from('incident-photos')
                .createSignedUrl(row.storage_path, 3600);
              await db.incident_media.put({
                ...row,
                signed_url: signed?.signedUrl,
              });
            } catch {
              await db.incident_media.put(row);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [incidentId, isOnline]);

  return {
    updates: localUpdates,
    media: localMedia,
    isFetchingRemote,
    refresh: fetchRemoteData,
  };
}
