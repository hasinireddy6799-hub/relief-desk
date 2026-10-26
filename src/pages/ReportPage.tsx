import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { db } from '@/db/dexie';
import { supabase, generateClientId, formatPoint } from '@/lib/supabase';
import { compressImage } from '@/utils/imageCompressor';
import { IncidentType, Incident } from '@/types/database';
import {
  AlertTriangle,
  Flame,
  CheckCircle,
  Camera,
  MapPin,
  Send,
  X,
  RefreshCw,
} from 'lucide-react';

const INCIDENT_TYPES: IncidentType[] = [
  'Flood',
  'Fire',
  'Earthquake',
  'Cyclone damage',
  'Landslide',
  'Road blockage',
  'Medical emergency',
  'Power outage',
  'Other',
];

export const ReportPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const { coords, recenter } = useUserLocation();

  const [type, setType] = useState<IncidentType>('Flood');
  const [severity, setSeverity] = useState<1 | 2 | 3 | 4>(2);
  const [description, setDescription] = useState('');
  const [addressLabel, setAddressLabel] = useState('');
  const [peopleAffected, setPeopleAffected] = useState(0);

  // Photo state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [_photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingPhoto(true);
    try {
      const { blob, dataUrl } = await compressImage(file, 1280, 200 * 1024);
      setPhotoBlob(blob);
      setPhotoPreview(dataUrl);
    } catch (err) {
      console.error('Error compressing photo:', err);
      setErrorMessage('Could not process photo. Please try a different image.');
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setPhotoBlob(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const clientId = generateClientId();
      const now = new Date().toISOString();
      const locationText = formatPoint(coords.lng, coords.lat);

      const incidentRecord: Incident = {
        id: clientId,
        client_id: clientId,
        type,
        severity,
        status: 'reported',
        description: description.trim() || null,
        address_label: addressLabel.trim() || null,
        people_affected: peopleAffected,
        location: locationText,
        is_sos: false,
        confirmations: 1,
        duplicate_of: null,
        reported_by: user?.id || null,
        assigned_to: null,
        created_at: now,
        updated_at: now,
        resolved_at: null,
        deleted_at: null,
        lng: coords.lng,
        lat: coords.lat,
      };

      // 1. Optimistic write to Dexie IndexedDB cache immediately
      await db.incidents.put(incidentRecord);

      // 2. Put into Dexie Outbox for sync engine
      const outboxPayload = {
        client_id: clientId,
        type,
        severity,
        status: 'reported',
        description: description.trim() || null,
        address_label: addressLabel.trim() || null,
        people_affected: peopleAffected,
        location: locationText,
        is_sos: false,
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
        is_sos: false,
      });

      // 3. If online, attempt direct upsert
      if (isOnline) {
        try {
          const { error: upsertError } = await supabase
            .from('incidents')
            .upsert(outboxPayload, { onConflict: 'client_id', ignoreDuplicates: true });

          if (!upsertError) {
            // Update outbox entry to synced
            await db.outbox.where('clientId').equals(clientId).modify({ status: 'synced' });
          }
        } catch (networkErr) {
          console.warn('Network write deferred to outbox sync:', networkErr);
        }
      }

      // Navigate back to map to view report
      navigate('/');
    } catch (err: any) {
      console.error('Failed to submit incident:', err);
      setErrorMessage(err?.message || 'Failed to save incident report');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
        <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          {t('nav.report')} Hazard or Incident
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Reports are saved locally and synced to all responders as soon as connected.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Incident Type Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Incident Type *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {INCIDENT_TYPES.map((tName) => (
              <button
                key={tName}
                type="button"
                onClick={() => setType(tName)}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition text-left flex items-center justify-between ${
                  type === tName
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <span>{tName}</span>
                {type === tName && <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
              </button>
            ))}
          </div>
        </div>

        {/* Severity Scale 1-4 with Shape, Icon, and Label */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            Severity Rating *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Low */}
            <button
              type="button"
              onClick={() => setSeverity(1)}
              className={`min-h-[52px] p-2.5 rounded-xl border text-left flex flex-col justify-between transition ${
                severity === 1
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400">
                  LEVEL 1
                </span>
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
                Low
              </span>
            </button>

            {/* Moderate */}
            <button
              type="button"
              onClick={() => setSeverity(2)}
              className={`min-h-[52px] p-2.5 rounded-xl border text-left flex flex-col justify-between transition ${
                severity === 2
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="w-3 h-3 rounded-sm bg-amber-500"></span>
                <span className="text-[10px] font-black text-amber-700 dark:text-amber-400">
                  LEVEL 2
                </span>
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
                Moderate
              </span>
            </button>

            {/* High */}
            <button
              type="button"
              onClick={() => setSeverity(3)}
              className={`min-h-[52px] p-2.5 rounded-xl border text-left flex flex-col justify-between transition ${
                severity === 3
                  ? 'bg-orange-50 dark:bg-orange-950/60 border-orange-500 ring-2 ring-orange-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="w-3 h-3 rotate-45 bg-orange-500"></span>
                <span className="text-[10px] font-black text-orange-700 dark:text-orange-400">
                  LEVEL 3
                </span>
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
                High
              </span>
            </button>

            {/* Critical */}
            <button
              type="button"
              onClick={() => setSeverity(4)}
              className={`min-h-[52px] p-2.5 rounded-xl border text-left flex flex-col justify-between transition ${
                severity === 4
                  ? 'bg-red-50 dark:bg-red-950/60 border-red-500 ring-2 ring-red-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <Flame className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                <span className="text-[10px] font-black text-red-700 dark:text-red-400">
                  LEVEL 4
                </span>
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
                Critical
              </span>
            </button>
          </div>
        </div>

        {/* Location Picker / GPS Coordinates */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Incident Location *
              </label>
            </div>
            <button
              type="button"
              onClick={recenter}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 hover:underline"
            >
              <RefreshCw className="w-3 h-3" />
              Update GPS
            </button>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded">
              GPS Fixed
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Landmark or Street Address
            </label>
            <input
              type="text"
              value={addressLabel}
              onChange={(e) => setAddressLabel(e.target.value)}
              placeholder="e.g. Near River Bridge, Opp. High School"
              className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* People Affected Counter */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            People Affected
          </label>
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setPeopleAffected((c) => Math.max(0, c - 1))}
                className="w-11 h-11 flex items-center justify-center font-bold text-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200"
              >
                -
              </button>
              <span className="w-14 text-center font-bold text-sm text-slate-900 dark:text-slate-100">
                {peopleAffected}
              </span>
              <button
                type="button"
                onClick={() => setPeopleAffected((c) => c + 1)}
                className="w-11 h-11 flex items-center justify-center font-bold text-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200"
              >
                +
              </button>
            </div>
            <span className="text-xs text-slate-500">
              Approximate count of individuals requiring evacuation or aid
            </span>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Situation Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the severity, blocked roads, water depth, or immediate dangers..."
            className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Photo Upload with in-browser compression */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Hazard Photo (Optional)
          </label>
          {photoPreview ? (
            <div className="relative w-full max-w-xs rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700">
              <img
                src={photoPreview}
                alt="Hazard preview"
                className="w-full h-44 object-cover"
              />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px]">
                Compressed (~200KB)
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {isCompressingPhoto ? (
                  <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-slate-400 mb-2" />
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                      Take photo or select image
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Auto-compressed to ~1280px / 200KB
                    </p>
                  </>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoSelect}
                className="hidden"
                disabled={isCompressingPhoto}
              />
            </label>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || isCompressingPhoto}
            className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-base shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Recording Report...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Submit Incident Report</span>
              </>
            )}
          </button>
          <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-2">
            Available immediately offline and broadcasted upon reconnection.
          </p>
        </div>
      </form>
    </div>
  );
};
