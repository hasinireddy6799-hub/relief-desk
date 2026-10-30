import { db } from '@/db/dexie';
import { supabase, generateClientId } from '@/lib/supabase';
import { syncOutbox } from '@/services/syncEngine';

export interface SupplyRow {
  id: string;
  name: string;
  unit: string | null;
  qty: number;
  min_qty: number;
  shelter_id: string | null;
  updated_at: string;
}

export async function refreshSupplies(): Promise<void> {
  const { data, error } = await supabase
    .from('supplies')
    .select('id,name,unit,qty,min_qty,shelter_id,updated_at');
  if (error || !data) return;

  // Skip supplies that still have a stock change waiting in the outbox
  const queued = await db.outbox
    .filter(
      (o) =>
        o.table === 'supply_transactions' && (o.status === 'pending' || o.status === 'syncing')
    )
    .toArray();
  const busy = new Set(queued.map((o) => String(o.payload.supply_id)));

  await db.supplies.bulkPut((data as any[]).filter((r) => !busy.has(r.id)));
}

// Stock never changes directly: every change is a transaction row (+ restock, - use)
export async function changeStock(params: {
  supplyId: string;
  delta: number;
  reason?: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const supply: any = await db.supplies.get(params.supplyId);
  if (!supply) throw new Error('Supply not found.');
  if (supply.qty + params.delta < 0) throw new Error('Not enough stock.');

  // 1. local cache (optimistic)
  await db.supplies.update(params.supplyId, { qty: supply.qty + params.delta } as any);

  // 2. outbox
  await db.outbox.add({
    table: 'supply_transactions',
    op: 'INSERT',
    payload: {
      supply_id: params.supplyId,
      delta: params.delta,
      reason: params.reason?.trim().slice(0, 200) || (params.delta > 0 ? 'Restock' : 'Used'),
    },
    clientId: generateClientId(),
    createdAt: now,
    attempts: 0,
    status: 'pending',
  });

  // 3. sync now if online
  if (navigator.onLine) await syncOutbox();
}
