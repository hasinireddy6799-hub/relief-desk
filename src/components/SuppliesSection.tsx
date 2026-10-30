import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/dexie';
import { useSupplies } from '@/hooks/useSupplies';
import { changeStock, SupplyRow } from '@/services/supplyService';

const SupplyCard: React.FC<{ supply: SupplyRow; shelterName?: string }> = ({
  supply,
  shelterName,
}) => {
  const [amount, setAmount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const low = supply.qty < supply.min_qty;
  const pct =
    supply.min_qty > 0 ? Math.min(100, Math.round((supply.qty / supply.min_qty) * 100)) : 100;

  const apply = async (sign: 1 | -1) => {
    setError(null);
    if (!Number.isInteger(amount) || amount < 1) return setError('Enter a whole number, 1 or more.');
    setBusy(true);
    try {
      await changeStock({ supplyId: supply.id, delta: sign * amount });
    } catch (e: any) {
      setError(e?.message || 'Could not save. Try again.');
    }
    setBusy(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">{supply.name}</h3>
          {shelterName && (
            <p className="text-xs text-slate-500 dark:text-slate-400">At {shelterName}</p>
          )}
        </div>
        <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 whitespace-nowrap">
          {low ? 'Low stock' : 'Stock OK'}
        </span>
      </div>

      <div>
        <div
          className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"
          role="progressbar"
          aria-valuenow={supply.qty}
          aria-valuemin={0}
          aria-valuemax={Math.max(supply.min_qty, supply.qty)}
          aria-label="Stock compared to minimum"
        >
          <div className={`h-full ${low ? 'bg-red-600' : 'bg-emerald-600'}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs mt-1 font-semibold text-slate-700 dark:text-slate-300">
          {supply.qty} {supply.unit || 'units'} in stock, minimum {supply.min_qty}
          {low ? `. Need ${supply.min_qty - supply.qty} more.` : ''}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          aria-label="Amount"
          className="w-24 min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-base"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => apply(1)}
          className="min-h-[44px] px-4 rounded-xl bg-blue-600 text-white font-bold text-sm disabled:opacity-50"
        >
          Restock
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => apply(-1)}
          className="min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-sm text-slate-800 dark:text-slate-200 disabled:opacity-50"
        >
          Use
        </button>
      </div>
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
};

export const SuppliesSection: React.FC = () => {
  const { supplies } = useSupplies();
  const shelters = (useLiveQuery(() => db.shelters.toArray(), []) ?? []) as unknown as {
    id: string;
    name: string;
  }[];
  const names = new Map(shelters.map((s) => [s.id, s.name]));

  const sorted = [...supplies].sort((a, b) => {
    const lowA = a.qty < a.min_qty ? 0 : 1;
    const lowB = b.qty < b.min_qty ? 0 : 1;
    return lowA - lowB || a.name.localeCompare(b.name);
  });
  const lowCount = sorted.filter((s) => s.qty < s.min_qty).length;

  return (
    <section className="space-y-3 pt-2">
      <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">Supplies</h2>
      {lowCount > 0 && (
        <p
          role="status"
          className="text-sm font-bold px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800"
        >
          Warning: {lowCount} {lowCount === 1 ? 'item is' : 'items are'} low on stock.
        </p>
      )}
      {sorted.length === 0 && (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No supplies yet. Connect to the internet once to load them.
        </p>
      )}
      {sorted.map((s) => (
        <SupplyCard
          key={s.id}
          supply={s}
          shelterName={s.shelter_id ? names.get(s.shelter_id) : undefined}
        />
      ))}
    </section>
  );
};
