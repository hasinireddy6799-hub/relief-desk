import React from 'react';
import { Incident } from '@/types/database';
import { IncidentCard } from './IncidentCard';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

interface IncidentListProps {
  incidents: Incident[];
  selectedIncidentId?: string | null;
  onSelectIncident?: (incident: Incident) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const IncidentList: React.FC<IncidentListProps> = ({
  incidents,
  selectedIncidentId,
  onSelectIncident,
  isLoading,
  onRefresh,
}) => {
  if (isLoading && incidents.length === 0) {
    return (
      <div className="p-8 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          Loading nearby incidents...
        </p>
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/50 space-y-3">
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-slate-800 dark:text-slate-200">
          No Incidents Found
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
          No active hazards match your current filters or location radius. Stay alert and report any emergencies immediately.
        </p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Refresh Area
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span className="font-semibold">
          Showing {incidents.length} {incidents.length === 1 ? 'incident' : 'incidents'}
        </span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {incidents.map((incident) => (
          <IncidentCard
            key={incident.id}
            incident={incident}
            isSelected={selectedIncidentId === incident.id}
            onSelect={onSelectIncident}
          />
        ))}
      </div>
    </div>
  );
};
