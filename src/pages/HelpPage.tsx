import React, { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/dexie';
import { useAuth } from '@/context/AuthContext';
import { useHelpRequests } from '@/hooks/useHelpRequests';
import {
  CATEGORIES,
  HelpCategory,
  HelpRow,
  URGENCY_LABELS,
  createHelpRequest,
  updateHelpRequest,
} from '@/services/helpService';

const inputClass =
  'w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-base';

const RequestForm: React.FC = () => {
  const { user } = useAuth();
  const [category, setCategory] = useState<HelpCategory>('water');
  const [urgency, setUrgency] = useState(2);
  const [peopleCount, setPeopleCount] = useState(1);
  const [details, setDetails] = useState('');
  const [phone, setPhone] = useState('');
  const [pos, setPos] = useState<{ lng: number; lat: number } | null>(null);
  const [locStatus, setLocStatus] = useState('Finding your location...');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const findLocation = useCallback(() => {
    setLocStatus('Finding your location...');
    if (!navigator.geolocation) {
      setLocStatus('Location is not available on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lng: p.coords.longitude, lat: p.coords.latitude });
        setLocStatus('Location found');
      },
      () => setLocStatus('Location not found. Allow location access and try again.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    findLocation();
  }, [findLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!user) return setError('Sign-in is not ready yet. Wait a moment and try again.');
    if (!pos) return setError('We need your location to send help to you.');
    if (peopleCount < 1) return setError('Enter at least 1 person.');
    setBusy(true);
    try {
      await createHelpRequest({
        category,
        urgency,
        details,
        peopleCount,
        phone,
        lng: pos.lng,
        lat: pos.lat,
        userId: user.id,
      });
      setDetails('');
      setMessage('Request saved. It will be sent as soon as you are online.');
    } catch {
      setError('Could not save your request. Try again.');
    }
    setBusy(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3"
    >
      <h2 className="font-bold text-slate-900 dark:text-slate-100">Ask for help</h2>

      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
        What do you need?
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as HelpCategory)}
          className={`${inputClass} mt-1 capitalize`}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
        How urgent is it?
        <select
          value={urgency}
          onChange={(e) => setUrgency(Number(e.target.value))}
          className={`${inputClass} mt-1`}
        >
          {[1, 2, 3, 4].map((u) => (
            <option key={u} value={u}>
              {URGENCY_LABELS[u]}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
        How many people?
        <input
          type="number"
          min={1}
          value={peopleCount}
          onChange={(e) => setPeopleCount(Number(e.target.value))}
          className={`${inputClass} mt-1`}
        />
      </label>

      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
        Details (optional)
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={500}
          rows={3}
          className={`${inputClass} mt-1`}
        />
      </label>

      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
        Phone number (only volunteers can see it)
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={20}
          className={`${inputClass} mt-1`}
        />
      </label>

      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
        <span>{locStatus}</span>
        {!pos && (
          <button
            type="button"
            onClick={findLocation}
            className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700"
          >
            Try again
          </button>
        )}
      </div>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      {message && <p className="text-sm font-semibold text-emerald-700">{message}</p>}

      <button
        type="submit"
        disabled={busy || !pos}
        className="w-full min-h-[48px] rounded-xl bg-blue-600 text-white font-bold disabled:opacity-50"
      >
        Send request
      </button>
    </form>
  );
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
    matched: 'Granted',
  in_progress: 'In progress',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
};

const RequestCard: React.FC<{
  req: HelpRow;
  isResponder: boolean;
  userId?: string;
  shelters: { id: string; name: string }[];
}> = ({ req, isResponder, userId, shelters }) => {
  const [shelterId, setShelterId] = useState('');
  const btn =
    'min-h-[44px] px-4 rounded-xl font-bold text-sm bg-blue-600 text-white';

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold capitalize text-slate-900 dark:text-slate-100">
          {req.category}, {req.people_count} {req.people_count === 1 ? 'person' : 'people'}
        </h3>
        <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 whitespace-nowrap">
          {URGENCY_LABELS[req.urgency]} urgency
        </span>
      </div>
      {req.details && (
        <p className="text-sm text-slate-700 dark:text-slate-300">{req.details}</p>
      )}
      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
        Status: {STATUS_LABELS[req.status] ?? req.status}
        {req.assigned_to && req.assigned_to === userId ? ' (by you)' : ''}
      </p>

      {isResponder && req.contact_phone && (
        <a
          href={`tel:${req.contact_phone}`}
          className="inline-block text-sm font-bold text-blue-700 dark:text-blue-400"
        >
          Call {req.contact_phone}
        </a>
      )}

      {isResponder && req.status === 'open' && (
        <div className="flex flex-wrap gap-2 pt-1">
          <select
            value={shelterId}
            onChange={(e) => setShelterId(e.target.value)}
            aria-label="Match to a shelter"
            className="flex-1 min-w-[140px] min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm"
          >
            <option value="">No shelter</option>
            {shelters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={btn}
            onClick={() =>
              updateHelpRequest(req.id, {
                status: 'matched',
                assigned_to: userId ?? null,
                shelter_id: shelterId || null,
              })
            }
          >
            Claim
          </button>
        </div>
      )}
      {isResponder && req.status === 'matched' && (
        <button
          type="button"
          className={btn}
          onClick={() => updateHelpRequest(req.id, { status: 'in_progress' })}
        >
          Start helping
        </button>
      )}
      {isResponder && req.status === 'in_progress' && (
        <button
          type="button"
          className={btn}
          onClick={() => updateHelpRequest(req.id, { status: 'fulfilled' })}
        >
          Mark fulfilled
        </button>
      )}

      {!isResponder && req.status === 'open' && (
        <button
          type="button"
          className="min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-bold"
          onClick={() => updateHelpRequest(req.id, { status: 'cancelled' })}
        >
          Cancel request
        </button>
      )}
    </div>
  );
};

export const HelpPage: React.FC = () => {
  const { user, isResponder } = useAuth();
  const { requests } = useHelpRequests();
  const shelters = (useLiveQuery(() => db.shelters.toArray(), []) ?? []) as unknown as {
    id: string;
    name: string;
  }[];
  const [tab, setTab] = useState<'queue' | 'ask'>(isResponder ? 'queue' : 'ask');

  const queue = requests
    .filter((r) => ['open', 'matched', 'in_progress'].includes(r.status))
    .sort((a, b) => b.urgency - a.urgency || a.created_at.localeCompare(b.created_at));
  const mine = requests
    .filter((r) => r.requested_by === user?.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">Help requests</h1>

      {isResponder && (
        <div className="flex gap-2">
          {(['queue', 'ask'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 min-h-[44px] rounded-xl font-bold text-sm border ${
                tab === t
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}
            >
              {t === 'queue' ? 'Queue' : 'Ask for help'}
            </button>
          ))}
        </div>
      )}

      {(!isResponder || tab === 'ask') && <RequestForm />}

      {isResponder && tab === 'queue' && (
        <div className="space-y-3">
          {queue.length === 0 && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No open requests right now.
            </p>
          )}
          {queue.map((r) => (
            <RequestCard
              key={r.id}
              req={r}
              isResponder
              userId={user?.id}
              shelters={shelters}
            />
          ))}
        </div>
      )}

      {!isResponder && (
        <div className="space-y-3">
          <h2 className="font-bold text-slate-900 dark:text-slate-100">My requests</h2>
          {mine.length === 0 && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              You have not sent any requests yet.
            </p>
          )}
          {mine.map((r) => (
            <RequestCard
              key={r.id}
              req={r}
              isResponder={false}
              userId={user?.id}
              shelters={shelters}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HelpPage;
