import React from 'react';
import { Incident } from '@/types/database';
import { Users, AlertTriangle, MapPin, CheckCircle, Flame, Clock } from 'lucide-react';

interface IncidentCardProps {
  incident: Incident;
  isSelected?: boolean;
  onSelect?: (incident: Incident) => void;
}

export const IncidentCard: React.FC<IncidentCardProps> = ({
  incident,
  isSelected,
  onSelect,
}) => {
  const getSeverityBadge = () => {
    switch (incident.severity) {
      case 4:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800">
            <Flame className="w-3.5 h-3.5 text-red-600 animate-pulse" />
            <span>CRITICAL</span>
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
            <span>HIGH</span>
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>MODERATE</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>LOW</span>
          </span>
        );
    }
  };

  const getStatusBadge = () => {
    switch (incident.status) {
      case 'verified':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            Verified
          </span>
        );
      case 'responding':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
            Responding
          </span>
        );
      case 'resolved':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Resolved
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Reported
          </span>
        );
    }
  };

  // Format relative time
  const getTimeAgo = (dateStr: string) => {
    try {
      const ms = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(ms / (1000 * 60));
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      return `${Math.floor(hours / 24)}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div
      onClick={() => onSelect?.(incident)}
      className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white dark:bg-slate-900 ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              {incident.type}
            </h3>
            {getStatusBadge()}
          </div>
          {incident.address_label && (
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{incident.address_label}</span>
            </p>
          )}
        </div>
        <div>{getSeverityBadge()}</div>
      </div>

      {incident.description && (
        <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 line-clamp-2">
          {incident.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            {incident.confirmations} confirmed
          </span>
          {incident.people_affected > 0 && (
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              {incident.people_affected} affected
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          {incident.distance_m !== undefined && (
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {incident.distance_m < 1000
                ? `${incident.distance_m} m`
                : `${(incident.distance_m / 1000).toFixed(1)} km`}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {getTimeAgo(incident.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
};
