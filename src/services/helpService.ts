import { db } from '@/db/dexie';
import { supabase, generateClientId, formatPoint } from '@/lib/supabase';
import { syncOutbox } from '@/services/syncEngine';

export const CATEGORIES = [
  'water',
  'food',
  'medical',
  'rescue',
  'shelter',
  'transport',
  'other',
] as const;

export type HelpCategory = (typeof CATEGORIES)[number];
export type HelpStatus = 'open' | 'matched' | 'in_progress' | 'fulfilled' | 'cancelled';

export const URGENCY_LABELS: Record<number, string> = {
  1: 'Low',
  2: 'Moderate',
  3: 'High',
  4: 'Critical',
};

export interface HelpRow {
  id: string;
  client_id: string;
  category: HelpCategory;
  urgency: number;
  details: string | null;
  people_count: number;
  contact_phone: string | null;
  status: HelpStatus;
  requested_by: string | null;
  assigned_to: string | null;
  shelter_id: string | null;
  created_at: string;
  updated_at: string;
}

const COLUMNS =
  'id,client_id,category,urgency,details,people_count,contact_phone,status,requested_by,assigned_to,shelter_id,created_at,updated_at';

export async function refreshHelpRequests(): Promise<void> {
  const { data, error } = await supabase.from('help_requests').select(COLUMNS);
  if (error || !data) return;

  // Do not overwrite items that are still waiting in the outbox
  const queued = await db.outbox
    .filter((o) => o.table === 'help_requests' && o.status !== 'synced')
    .toArray();
  const busy = new Set(queued.map((o) => String(o.payload.id ?? o.clientId)));

  await db.help_requests.bulkPut(
    (data as unknown as HelpRow[]).filter((r) => !busy.has(r.id)) as any
  );
}

export async function createHelpRequest(p: {
  category: HelpCategory;
  urgency: number;
  details: string;
  peopleCount: number;
  phone: string;
  lng: number;
  lat: number;
  userId: string;
}): Promise<void> {
  const id = generateClientId();
  const now = new Date().toISOString();
  const details = p.details.trim().slice(0, 500) || null;
  const phone = p.phone.trim().slice(0, 20) || null;

  const payload = {
    id,
    client_id: id,
    category: p.category,
    urgency: p.urgency,
    details,
    people_count: p.peopleCount,
    contact_phone: phone,
    location: formatPoint(p.lng, p.lat),
    status: 'open',
    requested_by: p.userId,
  };

  // 1. local cache (optimistic)
  await db.help_requests.put({
    id,
    client_id: id,
    category: p.category,
    urgency: p.urgency,
    details,
    people_count: p.peopleCount,
    contact_phone: phone,
    status: 'open',
    requested_by: p.userId,
    assigned_to: null,
    shelter_id: null,
    created_at: now,
    updated_at: now,
  } as any);

  // 2. outbox
  await db.outbox.add({
    table: 'help_requests',
    op: 'INSERT',
    payload,
    clientId: id,
    createdAt: now,
    attempts: 0,
    status: 'pending',
  });

  // 3. sync now if online
  if (navigator.onLine) await syncOutbox();
}

export async function updateHelpRequest(
  id: string,
  changes: { status?: HelpStatus; assigned_to?: string | null; shelter_id?: string | null }
): Promise<void> {
  const now = new Date().toISOString();

  await db.help_requests.update(id, { ...changes, updated_at: now } as any);
  await db.outbox.add({
    table: 'help_requests',
    op: 'UPDATE',
    payload: { id, ...changes },
    clientId: generateClientId(),
    createdAt: now,
    attempts: 0,
    status: 'pending',
  });
  if (navigator.onLine) await syncOutbox();
}
