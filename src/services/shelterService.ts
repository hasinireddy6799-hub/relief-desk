import { db } from '@/db/dexie';
import { supabase, generateClientId } from '@/lib/supabase';
import { syncOutbox } from '@/services/syncEngine';

export interface ShelterRow {
  id: string;
  name: string;
  address: string | null;
  capacity: number;
  occupied: number;
  amenities: string[] | null;
  is_open: boolean;
  updated_at: string;
}

export interface CheckinRow {
  id: string;
  shelter_id: string;
  person_name: string | null;
  headcount: number;
  checked_in_at: string;
  checked_out_at: string | null;
}

export async function refreshShelters(): Promise<void> {
  const { data, error } = await supabase
    .from('shelters')
    .select('id,name,address,capacity,occupied,amenities,is_open,updated_at');
  if (error || !data) return;
  await db.shelters.bulkPut(data as any);
}

export async function refreshCheckins(): Promise<void> {
  const { data, error } = await supabase
    .from('shelter_checkins')
    .select('id,shelter_id,person_name,headcount,checked_in_at,checked_out_at')
    .is('checked_out_at', null);
  if (error || !data) return;

  // Items still waiting in the outbox must not be overwritten by server data
  const queued = await db.outbox
    .filter((o) => o.table === 'shelter_checkins' && o.status !== 'synced')
    .toArray();
  const busy = new Set(queued.map((o) => (o.op === 'UPDATE' ? String(o.payload.id) : o.clientId)));
  const remoteIds = new Set(data.map((r: CheckinRow) => r.id));

  await db.shelter_checkins.bulkPut(data.filter((r: CheckinRow) => !busy.has(r.id)));
  const active = await db.shelter_checkins.filter((c) => !c.checked_out_at).toArray();
  const stale = active.filter((c) => !remoteIds.has(c.id) && !busy.has(c.id)).map((c) => c.id);
  await db.shelter_checkins.bulkDelete(stale);
}

export async function checkInShelter(params: {
  shelterId: string;
  headcount: number;
  personName?: string;
}): Promise<void> {
  const id = generateClientId();
  const now = new Date().toISOString();
  const payload = {
    id,
    shelter_id: params.shelterId,
    person_name: params.personName?.trim() || null,
    headcount: params.headcount,
    checked_in_at: now,
  };

  // 1. local cache (optimistic)
  await db.shelter_checkins.put({ ...payload, checked_out_at: null });
  const shelter: any = await db.shelters.get(params.shelterId);
  if (shelter) {
    await db.shelters.update(params.shelterId, { occupied: shelter.occupied + params.headcount } as any);
  }
  // 2. outbox
  await db.outbox.add({
    table: 'shelter_checkins',
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

export async function checkOutShelter(checkin: CheckinRow): Promise<void> {
  const now = new Date().toISOString();

  await db.shelter_checkins.update(checkin.id, { checked_out_at: now });
  const shelter: any = await db.shelters.get(checkin.shelter_id);
  if (shelter) {
    await db.shelters.update(checkin.shelter_id, {
      occupied: Math.max(0, shelter.occupied - checkin.headcount),
    } as any);
  }
  await db.outbox.add({
    table: 'shelter_checkins',
    op: 'UPDATE',
    payload: { id: checkin.id, checked_out_at: now },
    clientId: generateClientId(),
    createdAt: now,
    attempts: 0,
    status: 'pending',
  });
  if (navigator.onLine) await syncOutbox();
}
