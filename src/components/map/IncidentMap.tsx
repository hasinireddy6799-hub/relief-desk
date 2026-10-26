import React, { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import Supercluster from 'supercluster';
import { Incident } from '@/types/database';
import { createSeverityIcon, createUserLocationIcon, createClusterIcon } from './mapIcons';
import { Locate, Users, AlertTriangle } from 'lucide-react';
import L from 'leaflet';

interface IncidentMapProps {
  incidents: Incident[];
  userCoords: { lng: number; lat: number };
  accuracy?: number | null;
  onUserCoordsChange?: (coords: { lng: number; lat: number }) => void;
  onSelectIncident?: (incident: Incident) => void;
  selectedIncidentId?: string | null;
}

// Controller component to center map on coordinates
function RecenterMap({ coords }: { coords: { lng: number; lat: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([coords.lat, coords.lng], map.getZoom());
  }, [coords, map]);
  return null;
}

// Map events listener to update zoom and bounds for supercluster
function MapEventListener({
  onBoundsChange,
}: {
  onBoundsChange: (bounds: [number, number, number, number], zoom: number) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      onBoundsChange(
        [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
        Math.round(map.getZoom())
      );
    },
    zoomend: () => {
      const b = map.getBounds();
      onBoundsChange(
        [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
        Math.round(map.getZoom())
      );
    },
  });

  useEffect(() => {
    const b = map.getBounds();
    onBoundsChange(
      [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
      Math.round(map.getZoom())
    );
  }, [map, onBoundsChange]);

  return null;
}

export const IncidentMap: React.FC<IncidentMapProps> = ({
  incidents,
  userCoords,
  accuracy,
  onUserCoordsChange,
  onSelectIncident,
  selectedIncidentId: _selectedIncidentId,
}) => {
  const tileUrl =
    import.meta.env.VITE_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const [bounds, setBounds] = useState<[number, number, number, number]>([
    userCoords.lng - 0.05,
    userCoords.lat - 0.05,
    userCoords.lng + 0.05,
    userCoords.lat + 0.05,
  ]);
  const [zoom, setZoom] = useState<number>(13);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  // Initialize Supercluster
  const supercluster = useMemo(() => {
    const cluster = new Supercluster({
      radius: 50,
      maxZoom: 16,
    });

    const points = incidents
      .filter((inc) => typeof inc.lng === 'number' && typeof inc.lat === 'number')
      .map((inc) => ({
        type: 'Feature' as const,
        properties: {
          cluster: false,
          incidentId: inc.id,
          incident: inc,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [inc.lng!, inc.lat!],
        },
      }));

    cluster.load(points);
    return cluster;
  }, [incidents]);

  // Get clusters for current viewport bounds and zoom
  const clusters = useMemo(() => {
    try {
      return supercluster.getClusters(bounds, zoom);
    } catch {
      return [];
    }
  }, [supercluster, bounds, zoom]);

  const handleRecenter = () => {
    if (mapInstance) {
      mapInstance.flyTo([userCoords.lat, userCoords.lng], 15, { duration: 1 });
    }
  };

  const handleClusterClick = (clusterId: number, lng: number, lat: number) => {
    if (!mapInstance) return;
    const expansionZoom = Math.min(supercluster.getClusterExpansionZoom(clusterId), 18);
    mapInstance.flyTo([lat, lng], expansionZoom, { duration: 0.8 });
  };

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm z-0">
      <MapContainer
        center={[userCoords.lat, userCoords.lng]}
        zoom={13}
        className="w-full h-full min-h-[400px]"
        ref={setMapInstance}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={tileUrl}
          maxZoom={19}
        />

        <MapEventListener
          onBoundsChange={(b, z) => {
            setBounds(b);
            setZoom(z);
          }}
        />

        <RecenterMap coords={userCoords} />

        {/* User Draggable Marker */}
        <Marker
          position={[userCoords.lat, userCoords.lng]}
          icon={createUserLocationIcon()}
          draggable={Boolean(onUserCoordsChange)}
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target;
              const pos = marker.getLatLng();
              if (onUserCoordsChange) {
                onUserCoordsChange({ lng: pos.lng, lat: pos.lat });
              }
            },
          }}
        >
          <Popup>
            <div className="p-1 text-center">
              <span className="font-bold text-xs text-blue-700">Your Live GPS Location</span>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {userCoords.lat.toFixed(5)}, {userCoords.lng.toFixed(5)}
              </p>
              {onUserCoordsChange && (
                <p className="text-[10px] text-slate-400 mt-1 italic">
                  Drag pin or tap map to adjust
                </p>
              )}
            </div>
          </Popup>
        </Marker>

        {/* User accuracy circle */}
        {accuracy && accuracy > 0 && accuracy < 5000 && (
          <Circle
            center={[userCoords.lat, userCoords.lng]}
            radius={accuracy}
            pathOptions={{
              color: '#3B82F6',
              fillColor: '#60A5FA',
              fillOpacity: 0.12,
              weight: 1,
            }}
          />
        )}

        {/* Render Clusters & Incidents */}
        {clusters.map((cluster) => {
          const [lng, lat] = cluster.geometry.coordinates;
          const { cluster: isCluster, point_count: pointCount, incident } = cluster.properties;

          if (isCluster) {
            return (
              <Marker
                key={`cluster-${cluster.id}`}
                position={[lat, lng]}
                icon={createClusterIcon(pointCount)}
                eventHandlers={{
                  click: () => handleClusterClick(cluster.id as number, lng, lat),
                }}
              />
            );
          }

          // Single Incident Marker
          const inc = incident as Incident;
          return (
            <Marker
              key={`incident-${inc.id}`}
              position={[lat, lng]}
              icon={createSeverityIcon(
                inc.severity,
                inc.confirmations,
                inc.is_sos || inc.type === 'Emergency SOS'
              )}
              eventHandlers={{
                click: () => onSelectIncident?.(inc),
              }}
            >
              <Popup>
                <div className="p-2 min-w-[200px] max-w-[260px] space-y-2">
                  <div className="flex items-center justify-between gap-2 border-b pb-1.5">
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {inc.type}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                        inc.severity === 4
                          ? 'bg-red-100 text-red-700'
                          : inc.severity === 3
                          ? 'bg-orange-100 text-orange-700'
                          : inc.severity === 2
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {inc.severity === 4
                        ? 'Critical'
                        : inc.severity === 3
                        ? 'High'
                        : inc.severity === 2
                        ? 'Moderate'
                        : 'Low'}
                    </span>
                  </div>

                  {inc.description && (
                    <p className="text-xs text-slate-700 line-clamp-2">
                      {inc.description}
                    </p>
                  )}

                  {inc.address_label && (
                    <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                      <span>📍</span> {inc.address_label}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {inc.confirmations} confirmed
                    </span>
                    {inc.people_affected > 0 && (
                      <span className="flex items-center gap-1 text-red-600 font-semibold">
                        <AlertTriangle className="w-3 h-3" />
                        {inc.people_affected} affected
                      </span>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Map Controls: "Center on me" */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
        <button
          onClick={handleRecenter}
          aria-label="Centre map on my location"
          className="w-11 h-11 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition"
        >
          <Locate className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </button>
      </div>
    </div>
  );
};
