import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { MapPin, AlertTriangle, ShieldCheck, HeartPulse } from 'lucide-react';
import { Link } from 'react-router-dom';

export const MapPage: React.FC = () => {
  const { t } = useTranslation();
  const { role, isAnonymous } = useAuth();

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      {/* Emergency banner */}
      <div className="rounded-2xl p-4 bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <HeartPulse className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight">Disaster Response Network</h2>
            <p className="text-xs text-red-100 mt-0.5">
              Live coordinator & citizen offline-first channel
            </p>
          </div>
        </div>
        <Link
          to="/report"
          className="px-3.5 py-2 bg-white text-red-700 font-bold text-xs rounded-xl hover:bg-red-50 transition shadow-sm active:scale-95"
        >
          {t('nav.report')}
        </Link>
      </div>

      {/* Map Placeholder Card (ready for Leaflet in Stage 2) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center shadow-sm">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
          <MapPin className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {t('nav.map')} Ready
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Interactive offline Leaflet map with GPS tracking, clustering, and severity markers will load here in Stage 2.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Low
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Moderate
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            High
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            Critical (SOS)
          </span>
        </div>
      </div>

      {/* Quick summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
            <ShieldCheck className="w-4 h-4 text-brand" />
            <span>Active Role</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Current session: <span className="font-bold text-slate-900 dark:text-slate-100 capitalize">{role}</span> {isAnonymous && '(Guest)'}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Offline Sync Engine</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            IndexedDB outbox active. Reports and SOS queued offline and synchronized on reconnection.
          </p>
        </div>
      </div>
    </div>
  );
};
