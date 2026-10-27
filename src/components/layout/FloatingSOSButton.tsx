import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertOctagon, X, Send } from 'lucide-react';
import { db } from '@/db/dexie';
import { supabase, generateClientId, formatPoint } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export const FloatingSOSButton: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [isOpen, setIsOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [isSent, setIsSent] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playTone = (freq: number, durationSec: number) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationSec);
    } catch {
      // Audio playback fails silently if restricted
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && secondsLeft > 0 && !isSent) {
      // Audio & haptic cue on each tick
      playTone(600 + (5 - secondsLeft) * 100, 0.15);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(100);
        } catch {
          // ignore
        }
      }

      timer = setTimeout(() => {
        setSecondsLeft((s) => s - 1);
      }, 1000);
    } else if (isOpen && secondsLeft === 0 && !isSent) {
      triggerSOS();
    }
    return () => clearTimeout(timer);
  }, [isOpen, secondsLeft, isSent]);

  const handleOpen = () => {
    setSecondsLeft(5);
    setIsSent(false);
    setIsOpen(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    setSecondsLeft(5);
  };

  const triggerSOS = async () => {
    setIsSent(true);

    // Audio confirmation & stronger haptic
    playTone(1200, 0.4);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 300]);
      } catch {
        // ignore
      }
    }

    // Get current GPS coords or default fallback
    let lng = 78.9629;
    let lat = 20.5937;

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
          });
        });
        lng = position.coords.longitude;
        lat = position.coords.latitude;
      } catch (err) {
        console.warn('Geolocation unavailable for SOS, using fallback:', err);
      }
    }

    const clientId = generateClientId();
    const now = new Date().toISOString();

    const sosIncident = {
      id: clientId,
      client_id: clientId,
      type: 'Emergency SOS' as const,
      severity: 4 as const,
      status: 'reported' as const,
      description: 'EMERGENCY SOS: Immediate rescue or assistance requested!',
      address_label: 'Live GPS SOS',
      people_affected: 1,
      location: formatPoint(lng, lat),
      is_sos: true,
      confirmations: 1,
      duplicate_of: null,
      reported_by: user?.id || null,
      assigned_to: null,
      created_at: now,
      updated_at: now,
      resolved_at: null,
      deleted_at: null,
      lng,
      lat,
    };

    // Store in IndexedDB cache and outbox (highest priority)
    try {
      await db.incidents.put(sosIncident);

      // Add timeline entry
      await db.incident_updates.put({
        id: Date.now(),
        incident_id: clientId,
        author: user?.id || null,
        kind: 'status_change',
        old_status: null,
        new_status: 'reported',
        note: 'Emergency SOS broadcasted from device',
        created_at: now,
      });

      const outboxPayload = {
        client_id: clientId,
        type: 'Emergency SOS',
        severity: 4,
        status: 'reported',
        description: 'EMERGENCY SOS: Immediate rescue or assistance requested!',
        address_label: 'Live GPS SOS',
        people_affected: 1,
        location: formatPoint(lng, lat),
        is_sos: true,
        confirmations: 1,
        reported_by: user?.id || null,
      };

      await db.outbox.add({
        table: 'incidents',
        op: 'INSERT',
        payload: outboxPayload,
        clientId,
        createdAt: now,
        attempts: 0,
        status: 'pending',
        is_sos: true,
      });

      // Direct write if online
      if (isOnline) {
        try {
          const { error: upsertErr } = await supabase
            .from('incidents')
            .upsert(outboxPayload, { onConflict: 'client_id', ignoreDuplicates: true });
          if (!upsertErr) {
            await db.outbox.where('clientId').equals(clientId).modify({ status: 'synced' });
          }
        } catch (netErr) {
          console.warn('Direct SOS upload deferred to outbox:', netErr);
        }
      }
    } catch (err) {
      console.error('Failed to queue SOS incident:', err);
    }

    // Keep feedback visible for 2.5 seconds before closing
    setTimeout(() => {
      setIsOpen(false);
      setIsSent(false);
    }, 2500);
  };

  return (
    <>
      {/* Floating SOS Trigger Button */}
      <div className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-30">
        <button
          onClick={handleOpen}
          aria-label={t('sos.emergencySOS')}
          className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-xl shadow-red-900/40 border-2 border-white focus:outline-none focus:ring-4 focus:ring-red-500/50 transition-transform active:scale-95 animate-pulse"
        >
          <span className="sr-only">{t('sos.emergencySOS')}</span>
          <AlertOctagon className="w-8 h-8 group-hover:scale-110 transition-transform" />
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-yellow-400 text-black text-[10px] font-black uppercase rounded-full tracking-wider shadow">
            SOS
          </span>
        </button>
      </div>

      {/* SOS Countdown Modal Dialog */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sos-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border-2 border-red-500 p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {!isSent ? (
              <>
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/80 border-4 border-red-500 text-red-600 mb-4 animate-bounce">
                  <span className="text-3xl font-black">{secondsLeft}</span>
                </div>
                <h2
                  id="sos-dialog-title"
                  className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100"
                >
                  {t('sos.countdownTitle')}
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {t('sos.countdownText', { seconds: secondsLeft })}
                </p>

                <div className="mt-6 flex flex-col gap-3">
                  <button
                    onClick={handleCancel}
                    className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold text-base flex items-center justify-center gap-2 focus:ring-2 focus:ring-slate-400"
                  >
                    <X className="w-5 h-5" />
                    {t('sos.cancelSOS')}
                  </button>
                  <button
                    onClick={triggerSOS}
                    className="w-full min-h-[44px] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-red-600 hover:text-red-700 dark:text-red-400 flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {t('sos.triggerNow')}
                  </button>
                </div>
              </>
            ) : (
              <div className="py-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
                  <AlertOctagon className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  SOS Dispatched!
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Responders notified with your location.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
