import React, { useState } from 'react';
import { useIncidents } from '@/hooks/useIncidents';
import { useUserLocation } from '@/hooks/useUserLocation';
import { IncidentMap } from '@/components/map/IncidentMap';
import { IncidentFiltersBar } from '@/components/incidents/IncidentFiltersBar';
import { IncidentList } from '@/components/incidents/IncidentList';
import { Incident } from '@/types/database';
import { Map, List } from 'lucide-react';

export const MapPage: React.FC = () => {
  const { coords, accuracy, setCoords } = useUserLocation();
  const { incidents, totalCount, isFetchingServer, filters, setFilters, refetch } =
    useIncidents(coords);

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map');

  const handleSelectIncident = (incident: Incident) => {
    setSelectedIncident(incident);
    // On mobile, if in list view and an incident is selected, switch to map to focus it
    if (mobileView === 'list') {
      setMobileView('map');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-65px-56px)] max-w-7xl mx-auto p-2 sm:p-4 gap-3">
      {/* Filters Bar */}
      <div className="flex-shrink-0">
        <IncidentFiltersBar
          filters={filters}
          onChange={setFilters}
          incidentCount={totalCount}
        />
      </div>

      {/* Mobile Map / List Toggle */}
      <div className="flex md:hidden items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm flex-shrink-0">
        <button
          onClick={() => setMobileView('map')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            mobileView === 'map'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Map className="w-4 h-4" />
          <span>Map View</span>
        </button>
        <button
          onClick={() => setMobileView('list')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            mobileView === 'list'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <List className="w-4 h-4" />
          <span>List ({incidents.length})</span>
        </button>
      </div>

      {/* Main Content: Split Desktop Layout (Map Left, List Right) & Mobile Switch */}
      <div className="flex-1 flex flex-col md:flex-row gap-3 min-h-0 overflow-hidden">
        {/* Map Container */}
        <div
          className={`flex-1 h-full min-h-[300px] ${
            mobileView === 'map' ? 'block' : 'hidden md:block'
          }`}
        >
          <IncidentMap
            incidents={incidents}
            userCoords={coords}
            accuracy={accuracy}
            onUserCoordsChange={setCoords}
            onSelectIncident={handleSelectIncident}
            selectedIncidentId={selectedIncident?.id}
          />
        </div>

        {/* Incident List Drawer / Column */}
        <div
          className={`w-full md:w-[380px] lg:w-[420px] h-full overflow-y-auto pr-1 flex-shrink-0 ${
            mobileView === 'list' ? 'block' : 'hidden md:block'
          }`}
        >
          <IncidentList
            incidents={incidents}
            selectedIncidentId={selectedIncident?.id}
            onSelectIncident={handleSelectIncident}
            isLoading={isFetchingServer}
            onRefresh={refetch}
          />
        </div>
      </div>
    </div>
  );
};
