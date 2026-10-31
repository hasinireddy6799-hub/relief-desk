import { db } from '@/db/dexie';
import { supabase, generateClientId } from '@/lib/supabase';
import {
  IncidentStatus,
  IncidentUpdate,
  IncidentConfirmation,
  IncidentMedia,
} from '@/types/database';

/**
 * Checks if a user has already confirmed a given incident locally.
 */
export async function hasUserConfirmedIncident(
  incidentId: string,
  userId?: string | null
): Promise<boolean> {
  if (!userId) return false;
  try {
    const existing = await db.incident_confirmations
      .where({ incident_id: incidentId, user_id: userId })
      .first();
    return Boolean(existing);
  } catch {
    return false;
  }
}

/**
 * "I see this too" confirmation action.
 * 1. Optimistically updates Dexie incidents table (+1 confirmations).
 * 2. Saves confirmation record into Dexie incident_confirmations.
 * 3. Enqueues outbox item.
 * 4. Pushes to Supabase if online (triggers bump_confirmations on server).
 */
export async function confirmIncident(params: {
  incidentId: string;
  userId?: string | null;
  note?: string | null;
  isOnline: boolean;
}): Promise<{ success: boolean; newCount?: number; error?: string }> {
  const { incidentId, userId, note, isOnline } = params;
  if (!userId) {
    return { success: false, error: 'User must be authenticated or anonymous session active.' };
  }

  try {
    // Check if already confirmed
    const alreadyConfirmed = await hasUserConfirmedIncident(incidentId, userId);
    if (alreadyConfirmed) {
      return { success: false, error: 'You have already confirmed this incident.' };
    }

    const now = new Date().toISOString();

    // 1. Optimistically update local incident confirmation count
    const localIncident = await db.incidents.get(incidentId);
    let newCount = (localIncident?.confirmations || 1) + 1;
    if (localIncident) {
      await db.incidents.update(incidentId, {
        confirmations: newCount,
        updated_at: now,
      });
    }

    // 2. Save confirmation to local Dexie
    const confirmationRecord: IncidentConfirmation = {
      incident_id: incidentId,
      user_id: userId,
      note: note || 'I see this too',
      created_at: now,
    };
    await db.incident_confirmations.put(confirmationRecord);

    // 3. Add to Outbox
    const clientId = generateClientId();
    const payload = {
      incident_id: incidentId,
      user_id: userId,
      note: note || 'I see this too',
    };

    await db.outbox.add({
      table: 'incident_confirmations',
      op: 'INSERT',
      payload,
      clientId,
      createdAt: now,
      attempts: 0,
      status: 'pending',
    });

    // 4. If online, attempt direct write
    if (isOnline) {
      try {
        const { error: insertError } = await supabase
          .from('incident_confirmations')
          .insert(payload);

        if (!insertError) {
          await db.outbox.where('clientId').equals(clientId).modify({ status: 'synced' });
        }
      } catch (netErr) {
        console.warn('Network sync deferred to outbox:', netErr);
      }
    }

    return { success: true, newCount };
  } catch (err: any) {
    console.error('Error confirming incident:', err);
    return { success: false, error: err?.message || 'Failed to confirm incident' };
  }
}

/**
 * Updates an incident's workflow status:
 * 'reported' -> 'verified' -> 'responding' -> 'resolved'
 */
export async function updateIncidentStatus(params: {
  incidentId: string;
  newStatus: IncidentStatus;
  userId?: string | null;
  note?: string | null;
  isOnline: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const { incidentId, newStatus, userId, note, isOnline } = params;

  try {
    const localInc = await db.incidents.get(incidentId);
    const oldStatus = localInc?.status || 'reported';
    const now = new Date().toISOString();

    // 1. Optimistically update local incident
    await db.incidents.update(incidentId, {
      status: newStatus,
      updated_at: now,
      resolved_at: newStatus === 'resolved' ? now : null,
    });

    // 2. Log timeline change locally in incident_updates
    const updateRecord: IncidentUpdate = {
      id: Date.now(),
      incident_id: incidentId,
      author: userId || null,
      kind: 'status_change',
      old_status: oldStatus,
      new_status: newStatus,
      note: note || `Status changed to ${newStatus}`,
      created_at: now,
    };
    await db.incident_updates.put(updateRecord);

    // 3. Add outbox update for incident
    const clientId = generateClientId();
    await db.outbox.add({
      table: 'incidents',
      op: 'UPDATE',
      payload: {
        id: incidentId,
        status: newStatus,
        resolved_at: newStatus === 'resolved' ? now : null,
      },
      clientId,
      createdAt: now,
      attempts: 0,
      status: 'pending',
    });

    // 4. If online, update remote Supabase
    if (isOnline) {
      try {
        const { error } = await supabase
          .from('incidents')
          .update({
            status: newStatus,
            resolved_at: newStatus === 'resolved' ? now : null,
          })
          .eq('id', incidentId);

        if (!error) {
          await db.outbox.where('clientId').equals(clientId).modify({ status: 'synced' });
        }
      } catch (err) {
        console.warn('Network sync deferred to outbox for status change:', err);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to update incident status:', err);
    return { success: false, error: err?.message || 'Failed to update status' };
  }
}

/**
 * Adds an update note to an incident's timeline.
 */
export async function addIncidentTimelineNote(params: {
  incidentId: string;
  note: string;
  userId?: string | null;
  isOnline: boolean;
}): Promise<{ success: boolean; update?: IncidentUpdate; error?: string }> {
  const { incidentId, note, userId, isOnline } = params;
  if (!note.trim()) {
    return { success: false, error: 'Note cannot be empty.' };
  }

  try {
    const now = new Date().toISOString();
    const updateRecord: IncidentUpdate = {
      id: Date.now(),
      incident_id: incidentId,
      author: userId || null,
      kind: 'note',
      old_status: null,
      new_status: null,
      note: note.trim(),
      created_at: now,
    };

    // 1. Optimistic write to local Dexie
    await db.incident_updates.put(updateRecord);

    // 2. Queue in Outbox
    const clientId = generateClientId();
    const payload = {
      incident_id: incidentId,
      author: userId || null,
      kind: 'note',
      note: note.trim(),
    };

    await db.outbox.add({
      table: 'incident_updates',
      op: 'INSERT',
      payload,
      clientId,
      createdAt: now,
      attempts: 0,
      status: 'pending',
    });

    // 3. Direct write if online
    if (isOnline) {
      try {
        const { error } = await supabase.from('incident_updates').insert(payload);
        if (!error) {
          await db.outbox.where('clientId').equals(clientId).modify({ status: 'synced' });
        }
      } catch (err) {
        console.warn('Network sync deferred to outbox for timeline note:', err);
      }
    }

    return { success: true, update: updateRecord };
  } catch (err: any) {
    console.error('Failed to add timeline note:', err);
    return { success: false, error: err?.message || 'Failed to add timeline note' };
  }
}

/**
 * Uploads an incident photo:
 * Stores in Dexie incident_media with local dataUrl,
 * Queues in outbox, and if online uploads to Supabase storage 'incident-photos'.
 */
export async function uploadIncidentPhoto(params: {
  incidentId: string;
  blob: Blob;
  dataUrl: string;
  userId: string;
  isOnline: boolean;
}): Promise<{ success: boolean; media?: IncidentMedia; error?: string }> {
  const { incidentId, blob, dataUrl, userId, isOnline } = params;

  try {
    const mediaId = generateClientId();
    const now = new Date().toISOString();
    const fileName = `${mediaId}.jpg`;
    // Storage path enforced by RLS: (storage.foldername(name))[1] = auth.uid()
    const storagePath = `${userId}/${fileName}`;

    const mediaRecord: IncidentMedia = {
      id: mediaId,
      incident_id: incidentId,
      storage_path: storagePath,
      uploaded_by: userId,
      created_at: now,
      local_data_url: dataUrl,
    };

    // 1. Save in local Dexie media table
    await db.incident_media.put(mediaRecord);

    // 2. Queue in outbox
    const payload = {
      id: mediaId,
      incident_id: incidentId,
      storage_path: storagePath,
      uploaded_by: userId,
    };

    await db.outbox.add({
      table: 'incident_media',
      op: 'INSERT',
      payload,
      clientId: mediaId,
      createdAt: now,
      attempts: 0,
      status: 'pending',
      blobData: dataUrl,
    });

    // 3. If online, upload blob to Supabase Storage and insert row
    if (isOnline) {
      try {
        const { error: uploadError } = await supabase.storage
          .from('incident-photos')
          .upload(storagePath, blob, {
            contentType: 'image/jpeg',
            upsert: true,
          });

       
                if (uploadError) {
          console.error('Photo upload failed:', uploadError);
        } else {
          const { error: tableError } = await supabase
            .from('incident_media')
            .insert(payload);

          if (tableError) {
            console.error('incident_media insert failed:', tableError);
          } else {
            await db.outbox.where('clientId').equals(mediaId).modify({ status: 'synced' });
          }
        }
      } catch (err) {
        console.warn('Network photo upload deferred to outbox sync:', err);
      }
    }

    return { success: true, media: mediaRecord };
  } catch (err: any) {
    console.error('Failed to process incident photo:', err);
    return { success: false, error: err?.message || 'Failed to upload photo' };
  }
}
