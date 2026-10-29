import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useShelters } from '@/hooks/useShelters';
import {
  checkInShelter,
  checkOutShelter,
  ShelterRow,
  CheckinRow,
} from '@/services/shelterService';

function getStatus(s: ShelterRow) {
  const pct = s.capacity ? Math.min(100, Math.round((s.occupied / s.capacity) * 100)) : 0;
  if (!s.is_open) return { label: 'Closed', bar: 'bg-slate-500', pct };
  if (s.occupied >= s.capacity) return { label: 'Full', bar: 'bg-red-600', pct };
  if (pct >= 80) return { label: 'Almost full', bar: 'bg-orange-500', pct };
  return { label: 'Space available', bar: 'bg-emerald-600', pct };
}

const ShelterCard: React.FC<{
  shelter: ShelterRow;
  checkins: CheckinRow[];
  canManage: boolean;
}> = ({ shelter, checkins, canManage }) => {
  const [headcount, setHeadcount] = useState(1);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const status = getStatus(shelter);
  const free = shelter.capacity - shelter.occupied;

  const handleCheckIn = async () => {
    setError(null);
    if (headcount < 1) return setError('Enter at least 1 person.');
    if (headcount > free) return setError(`Only ${free} places left.`);
    setBusy(true);
    try {
      await checkInShelter({ shelterId: shelter.id, headcount, personName: name });
      setName('');
      setHeadcount(1);
    } catch {
      setError('Could not save. Try again.');
    }
    setBusy(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-bold text-slate-900 dark:text-slate-100">{shelter.name}</h2>
          {shelter.address && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{shelter.address}</p>
          )}
        </div>
        <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 whitespace-nowrap">
          {status.label}
        </span>
      </div>

      <div>
        <div
          className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"
          role="progressbar"
          aria-valuenow={shelter.occupied}
          aria-valuemin={0}
          aria-valuemax={shelter.capacity}
          aria-label="Shelter occupancy"
        >
          <div className={`h-full ${status.bar}`} style={{ width: `${status.pct}%` }} />
        </div>
        <p className="text-xs mt-1 font-semibold text-slate-700 dark:text-slate-300">
          {shelter.occupied} of {shelter.capacity} places used ({status.pct}%)
        </p>
      </div>

      {shelter.amenities && shelter.amenities.length > 0 && (
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Amenities: {shelter.amenities.join(', ')}
        </p>
      )}

      {canManage && (
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              className="flex-1 min-w-[140px] min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-base"
            />
            <input
              type="number"
              min={1}
              value={headcount}
              onChange={(e) => setHeadcount(Number(e.target.value))}
              aria-label="Number of people"
              className="w-20 min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-base"
            />
            <button
              type="button"
              onClick={handleCheckIn}
              disabled={busy || !shelter.is_open || free <= 0}
              className="min-h-[44px] px-4 rounded-xl bg-blue-600 text-white font-bold text-sm disabled:opacity-50"
            >
              Check in
            </button>
          </div>
          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

          {checkins.length > 0 && (
            <ul className="space-y-2">
              {checkins.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 text-sm text-slate-800 dark:text-slate-200"
                >
                  <span>
                    {c.person_name || 'Unnamed'} ({c.headcount})
                  </span>
                  <button
                    type="button"
                    onClick={() => checkOutShelter(c)}
                    className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold"
                  >
                    Check out
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export const SheltersPage: React.FC = () => {
  const { isResponder } = useAuth();
  const { shelters, checkins } = useShelters(isResponder);

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">Shelters</h1>
      {shelters.length === 0 && (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No shelters yet. Connect to the internet once to load them.
        </p>
      )}
      {shelters.map((s) => (
        <ShelterCard
          key={s.id}
          shelter={s}
          checkins={checkins.filter((c) => c.shelter_id === s.id)}
          canManage={isResponder}
        />
      ))}
    </div>
  );
};

export default SheltersPage;
