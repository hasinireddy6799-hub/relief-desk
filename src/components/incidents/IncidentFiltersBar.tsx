import React from 'react';
import { IncidentFilters } from '@/hooks/useIncidents';
import { IncidentType } from '@/types/database';
import { Search, Filter, X } from 'lucide-react';

interface IncidentFiltersBarProps {
  filters: IncidentFilters;
  onChange: (filters: IncidentFilters) => void;
  incidentCount: number;
}

const INCIDENT_TYPES: IncidentType[] = [
  'Flood',
  'Fire',
  'Earthquake',
  'Cyclone damage',
  'Landslide',
  'Road blockage',
  'Medical emergency',
  'Power outage',
  'Emergency SOS',
  'Other',
];

export const IncidentFiltersBar: React.FC<IncidentFiltersBarProps> = ({
  filters,
  onChange,
  incidentCount,
}) => {
  const handleTypeChange = (type: IncidentType | 'all') => {
    onChange({ ...filters, type });
  };

  const handleSeverityChange = (severity: number | 'all') => {
    onChange({ ...filters, severity });
  };

  const handleStatusChange = (status: IncidentFilters['status']) => {
    onChange({ ...filters, status });
  };

  const handleSearchChange = (searchQuery: string) => {
    onChange({ ...filters, searchQuery });
  };

  const clearFilters = () => {
    onChange({
      type: 'all',
      severity: 'all',
      status: 'open',
      searchQuery: '',
    });
  };

  const hasActiveFilters =
    filters.type !== 'all' ||
    filters.severity !== 'all' ||
    filters.status !== 'open' ||
    Boolean(filters.searchQuery.trim());

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm space-y-3">
      {/* Search Input & Status Toggle */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search incidents, landmarks, hazards..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            onClick={() => handleStatusChange(filters.status === 'open' ? 'all' : 'open')}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
              filters.status === 'open'
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300'
                : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            {filters.status === 'open' ? 'Active Incidents' : 'All Incidents'}
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              aria-label="Clear filters"
              className="px-2 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Severity Filter Pills (Shape + Icon + Label) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-semibold flex items-center gap-1 mr-1">
          <Filter className="w-3.5 h-3.5" />
          Severity:
        </span>
        <button
          onClick={() => handleSeverityChange('all')}
          className={`px-2.5 py-1 rounded-lg font-bold transition ${
            filters.severity === 'all'
              ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          All
        </button>
        <button
          onClick={() => handleSeverityChange(1)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold border transition ${
            filters.severity === 1
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Low
        </button>
        <button
          onClick={() => handleSeverityChange(2)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold border transition ${
            filters.severity === 2
              ? 'bg-amber-600 text-white border-amber-600'
              : 'border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'
          }`}
        >
          <span className="w-2 h-2 rounded-sm bg-amber-500"></span>
          Moderate
        </button>
        <button
          onClick={() => handleSeverityChange(3)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold border transition ${
            filters.severity === 3
              ? 'bg-orange-600 text-white border-orange-600'
              : 'border-orange-300 dark:border-orange-800 text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40'
          }`}
        >
          <span className="w-2 h-2 rotate-45 bg-orange-500"></span>
          High
        </button>
        <button
          onClick={() => handleSeverityChange(4)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold border transition ${
            filters.severity === 4
              ? 'bg-red-600 text-white border-red-600'
              : 'border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40'
          }`}
        >
          <span className="w-2 h-2 rounded-sm bg-red-500 animate-ping"></span>
          Critical
        </button>
      </div>

      {/* Type Selector Dropdown / Scrollable Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => handleTypeChange('all')}
          className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition ${
            filters.type === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          All Types ({incidentCount})
        </button>
        {INCIDENT_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => handleTypeChange(type)}
            className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition ${
              filters.type === type
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            {type}
          </button>
        ))}
      </div>
    </div>
  );
};
