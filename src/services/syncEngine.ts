import { db, OutboxItem } from '@/db/dexie';
import { supabase } from '@/lib/supabase';

// Table priority rank for outbox upload ordering:
// 0: SOS incidents (highest priority, always first)
// 1: Normal incidents
// 2: Confirmations
// 3: Photos (media)
// 4: Timeline updates / status changes
// 5: Help requests
// 6: Missing persons
// 7: Shelters & Checkins
// 8: Supplies & Transactions
// 9: Alerts
export function getTablePriorityRank(item: OutboxItem): number {
  if (item.is_sos || item.payload?.type === 'Emergency SOS') {
    return 0;
  }
  switch (item.table) {
    case 'incidents':
      return 1;
    case 'incident_confirmations':
      return 2;
    case 'incident_media':
      return 3;
    case 'incident_updates':
      return 4;
    case 'help_requests':
      return 5;
    case 'missing_persons':
      return 6;
    case 'shelter_checkins':
      return 7;
    case 'supply_transactions':
      return 8;
    case 'alerts':
      return 9;
    default:
      return 10;
  }
}

/**
 * Calculates exponential backoff delay in milliseconds.
 * 1st retry: 1s, 2nd: 2s, 3rd: 4s, 4th: 8s, 5th: 16s (max 60s).
 */
export function getExponentialBackoffDelay(attempts: number): number {
  if (attempts <= 0) return 0;
  const delayMs = Math.min(1000 * Math.pow(2, attempts - 1), 60000);
  return delayMs;
}

let isSyncRunning = false;

/**
 * Converts a data URL to a Blob for photo uploads.
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(';base64,');
  const contentType = parts[0].split(':')[1] || 'image/jpeg';
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
}

/**
 * Syncs a single OutboxItem to Supabase.
 */
async function processOutboxItem(item: OutboxItem): Promise<void> {
  const { table, op, payload, blobData } = item;

  switch (table) {
    case 'incidents': {
      if (op === 'INSERT') {
        const { error } = await supabase
          .from('incidents')
          .upsert(payload, { onConflict: 'client_id', ignoreDuplicates: true });
        if (error) throw error;
      } else if (op === 'UPDATE') {
        const { id, ...updates } = payload;
        const { error } = await supabase
          .from('incidents')
          .update(updates)
          .eq('id', id);
        if (error) throw error;
      }
      break;
    }

    case 'incident_confirmations': {
      const { error } = await supabase
        .from('incident_confirmations')
        .upsert(payload, { onConflict: 'incident_id,user_id', ignoreDuplicates: true });
      if (error) throw error;
      break;
    }

    case 'incident_updates': {
      const { error } = await supabase
        .from('incident_updates')
        .insert(payload);
      if (error) throw error;
      break;
    }

    case 'incident_media': {
      // 1. Upload photo blob to Supabase Storage if data exists
      if (blobData && payload.storage_path) {
        try {
          const blob = dataUrlToBlob(blobData);
          await supabase.storage
            .from('incident-photos')
            .upload(payload.storage_path, blob, {
              contentType: 'image/jpeg',
              upsert: true,
            });
        } catch (storageErr) {
          console.warn('Storage upload notice for incident photo:', storageErr);
        }
      }

      // 2. Insert record into incident_media table
      const { error } = await supabase
        .from('incident_media')
        .upsert(payload, { onConflict: 'id', ignoreDuplicates: true });
      if (error) throw error;
      break;
    }

    case 'help_requests': {
      const { error } = await supabase
        .from('help_requests')
        .upsert(payload, { onConflict: 'client_id', ignoreDuplicates: true });
      if (error) throw error;
      break;
    }

    case 'missing_persons': {
      const { error } = await supabase
        .from('missing_persons')
        .upsert(payload, { onConflict: 'client_id', ignoreDuplicates: true });
      if (error) throw error;
      break;
    }

        case 'shelter_checkins': {
      if (op === 'UPDATE') {
        const { id, ...updates } = payload;
        const { error } = await supabase
          .from('shelter_checkins')
          .update(updates)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('shelter_checkins')
          .upsert(payload, { onConflict: 'id', ignoreDuplicates: true });
        if (error) throw error;
      }
      break;
    }

    case 'supply_transactions': {
      const { error } = await supabase
        .from('supply_transactions')
        .insert(payload);
      if (error) throw error;
      break;
    }

    case 'alerts': {
      const { error } = await supabase
        .from('alerts')
        .insert(payload);
      if (error) throw error;
      break;
    }

    default:
      console.warn(`Unknown outbox table: ${table}`);
  }
}

/**
 * Main Outbox Sync Loop:
 * - Fetches all pending/syncing items
 * - Sorts them strictly: SOS first, then incidents, confirmations, photos, updates, others
 * - Executes with exponential backoff & max 5 retry attempts
 * - Dispatches 'relief-desk-synced' event on successful reconnect sync
 */
export async function syncOutbox(): Promise<{ processedCount: number; failedCount: number }> {
  if (isSyncRunning) return { processedCount: 0, failedCount: 0 };
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { processedCount: 0, failedCount: 0 };
  }

  isSyncRunning = true;
  let processedCount = 0;
  let failedCount = 0;

  try {
    const items = await db.outbox
      .filter((item) => item.status === 'pending' || item.status === 'syncing')
      .toArray();

    if (items.length === 0) {
      isSyncRunning = false;
      return { processedCount: 0, failedCount: 0 };
    }

    // Sort strictly by priority rank, then creation timestamp
    items.sort((a, b) => {
      const rankA = getTablePriorityRank(a);
      const rankB = getTablePriorityRank(b);
      if (rankA !== rankB) return rankA - rankB;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    for (const item of items) {
      // Check exponential backoff
      if (item.attempts > 0) {
        const requiredDelay = getExponentialBackoffDelay(item.attempts);
        const elapsed = Date.now() - new Date(item.createdAt).getTime();
        if (elapsed < requiredDelay) {
          continue; // Backoff window not yet reached
        }
      }

      // Mark as syncing
      if (item.id) {
        await db.outbox.update(item.id, { status: 'syncing' });
      }

      try {
        await processOutboxItem(item);

        // Success: mark as synced
        if (item.id) {
          await db.outbox.update(item.id, {
            status: 'synced',
            lastError: null,
          });
        }
        processedCount++;
      } catch (err: any) {
        console.error(`Failed to sync item ${item.id} (${item.table}):`, err);
        failedCount++;

        const nextAttempts = (item.attempts || 0) + 1;
        // Mark permanently failed after 5 attempts
        const isPermanentlyFailed = nextAttempts >= 5;

        if (item.id) {
          await db.outbox.update(item.id, {
            attempts: nextAttempts,
            lastError: err?.message || 'Sync failed',
            status: isPermanentlyFailed ? 'failed' : 'pending',
          });
        }
      }
    }

    if (processedCount > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('relief-desk-synced', {
          detail: { count: processedCount },
        })
      );
    }
  } catch (err) {
    console.error('Outbox sync run error:', err);
  } finally {
    isSyncRunning = false;
  }

  return { processedCount, failedCount };
}

/**
 * Resets a failed item to pending and triggers sync.
 */
export async function retryOutboxItem(id: number): Promise<void> {
  await db.outbox.update(id, {
    status: 'pending',
    attempts: 0,
    lastError: null,
  });
  await syncOutbox();
}

/**
 * Resets all failed items to pending and triggers sync.
 */
export async function retryAllFailedOutboxItems(): Promise<void> {
  await db.outbox
    .where('status')
    .equals('failed')
    .modify({
      status: 'pending',
      attempts: 0,
      lastError: null,
    });
  await syncOutbox();
}

/**
 * Dismisses/deletes an outbox item.
 */
export async function dismissOutboxItem(id: number): Promise<void> {
  await db.outbox.delete(id);
}

/**
 * Starts automatic background sync engine listeners:
 * - Immediate sync on startup
 * - Browser online event
 * - Tab visibility change
 * - Periodic interval (every 30 seconds while online)
 * - Service worker background sync registration
 */
export function startSyncEngine(): () => void {
  if (typeof window === 'undefined') return () => {};

  // 1. Initial sync
  syncOutbox();

  // 2. Online event listener
  const handleOnline = () => {
    syncOutbox();
  };
  window.addEventListener('online', handleOnline);

  // 3. Tab visibility listener
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      syncOutbox();
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);

  // 4. 30-second interval while online
  const interval = setInterval(() => {
    if (navigator.onLine) {
      syncOutbox();
    }
  }, 30000);

  // 5. Background sync registration if supported
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then((reg: any) => {
      reg.sync?.register('relief-desk-outbox-sync').catch(() => {});
    });
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    document.removeEventListener('visibilitychange', handleVisibility);
    clearInterval(interval);
  };
}
