import React, { useState, useMemo } from 'react';
import { Incident } from '@/types/database';
import { haversineDistanceM } from '@/utils/duplicateDetector';
import {
  Plus,
  Minus,
  Map as MapIcon,
} from 'lucide-react';

interface RadarMapFallbackProps {
  incidents: Incident[];
  userCoords: { lng: number; lat: number };
  onSelectIncident?: (incident: Incident) => void;
  onSwitchToTiles?: () => void;
}

export const RadarMapFallback: React.FC<RadarMapFallbackProps> = ({
  incidents,
  userCoords,
  onSelectIncident,
  onSwitchToTiles,
}) => {
  // Max radar range in meters (default 2500m / 2.5km)
  const [maxRangeM, setMaxRangeM] = useState<number>(2500);

  const zoomIn = () => setMaxRangeM((r) => Math.max(500, r / 2));
  const zoomOut = () => setMaxRangeM((r) => Math.min(20000, r * 2));

  // Compute bearing and relative position for each incident
  const plottedIncidents = useMemo(() => {
    return incidents
      .filter((inc) => typeof inc.lng === 'number' && typeof inc.lat === 'number')
      .map((inc) => {
        const distM = haversineDistanceM(userCoords.lng, userCoords.lat, inc.lng!, inc.lat!);

        // Calculate initial bearing in radians from user to incident
        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const φ1 = toRad(userCoords.lat);
        const φ2 = toRad(inc.lat!);
        const Δλ = toRad(inc.lng! - userCoords.lng);

        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x =
          Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
        const bearingRad = Math.atan2(y, x);

        // Normalized radius fraction (0 at center, 1 at edge)
        const radiusFraction = Math.min(1, distM / maxRangeM);

        return {
          incident: inc,
          distM,
          bearingRad,
          radiusFraction,
          isOutOfBounds: distM > maxRangeM,
        };
      });
  }, [incidents, userCoords, maxRangeM]);

  // Rings definition
  const ringFractions = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-2xl bg-slate-950 text-slate-100 overflow-hidden border border-slate-800 shadow-xl flex flex-col items-center justify-center select-none">
      {/* Top Overlay Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-mono font-bold uppercase tracking-wider text-emerald-400">
            Offline Tactical Radar
          </span>
          <span className="text-[10px] text-slate-400 hidden sm:inline">
            (Pins relative to your GPS position)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onSwitchToTiles && (
            <button
              onClick={onSwitchToTiles}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition"
            >
              <MapIcon className="w-3.5 h-3.5 text-blue-400" />
              <span>Standard Map</span>
            </button>
          )}
        </div>
      </div>

      {/* Radar SVG Display */}
      <div className="relative w-full max-w-[500px] aspect-square p-6 flex items-center justify-center">
        <svg
          viewBox="-200 -200 400 400"
          className="w-full h-full overflow-visible"
        >
          {/* Background grid circles */}
          {ringFractions.map((frac, idx) => {
            const r = frac * 170;
            const distLabel =
              frac * maxRangeM >= 1000
                ? `${((frac * maxRangeM) / 1000).toFixed(1)} km`
                : `${Math.round(frac * maxRangeM)} m`;
            return (
              <g key={`ring-${idx}`}>
                <circle
                  cx={0}
                  cy={0}
                  r={r}
                  fill="none"
                  stroke="#1E293B"
                  strokeWidth="1.2"
                  strokeDasharray={idx === 3 ? 'none' : '3 3'}
                />
                <text
                  x={5}
                  y={-r + 12}
                  fill="#64748B"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {distLabel}
                </text>
              </g>
            );
          })}

          {/* Compass Crosshairs */}
          <line x1="-175" y1="0" x2="175" y2="0" stroke="#1E293B" strokeWidth="1" />
          <line x1="0" y1="-175" x2="0" y2="175" stroke="#1E293B" strokeWidth="1" />
          <line x1="-120" y1="-120" x2="120" y2="120" stroke="#0F172A" strokeWidth="0.8" />
          <line x1="-120" y1="120" x2="120" y2="-120" stroke="#0F172A" strokeWidth="0.8" />

          {/* Compass Cardinal Points */}
          <text x="0" y="-180" textAnchor="middle" fill="#38BDF8" fontSize="11" fontWeight="bold">
            N
          </text>
          <text x="186" y="4" textAnchor="middle" fill="#64748B" fontSize="10">
            E
          </text>
          <text x="0" y="190" textAnchor="middle" fill="#64748B" fontSize="10">
            S
          </text>
          <text x="-186" y="4" textAnchor="middle" fill="#64748B" fontSize="10">
            W
          </text>

          {/* Rotating radar sweep beam */}
          <g className="animate-spin" style={{ transformOrigin: '0px 0px', animationDuration: '6s' }}>
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="-170"
              stroke="#38BDF8"
              strokeWidth="1.5"
              strokeOpacity="0.4"
            />
          </g>

          {/* Incident Pins */}
          {plottedIncidents.map(({ incident, distM, bearingRad, radiusFraction }) => {
            const r = radiusFraction * 170;
            // Angle measured clockwise from North:
            // x = r * sin(bearing), y = -r * cos(bearing)
            const posX = r * Math.sin(bearingRad);
            const posY = -r * Math.cos(bearingRad);

            const isSos = incident.is_sos || incident.type === 'Emergency SOS';
            const color =
              incident.severity === 4
                ? '#EF4444'
                : incident.severity === 3
                ? '#F97316'
                : incident.severity === 2
                ? '#F59E0B'
                : '#10B981';

            return (
              <g
                key={incident.id}
                transform={`translate(${posX}, ${posY})`}
                onClick={() => onSelectIncident?.(incident)}
                className="cursor-pointer group"
              >
                {/* Ping wave for critical/SOS */}
                {(incident.severity === 4 || isSos) && (
                  <circle
                    cx={0}
                    cy={0}
                    r={12}
                    fill={color}
                    fillOpacity="0.3"
                    className="animate-ping"
                  />
                )}

                {/* Marker body */}
                <circle
                  cx={0}
                  cy={0}
                  r={8 + Math.min(4, (incident.confirmations || 1))}
                  fill={color}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  className="group-hover:scale-125 transition-transform"
                />

                {/* Text tag */}
                <text
                  x={12}
                  y={4}
                  fill="#F8FAFC"
                  fontSize="9"
                  fontWeight="bold"
                  className="pointer-events-none select-none drop-shadow"
                >
                  {incident.type} ({distM < 1000 ? `${distM}m` : `${(distM / 1000).toFixed(1)}k`})
                </text>
              </g>
            );
          })}

          {/* Center: User Location */}
          <g>
            <circle cx="0" cy="0" r="14" fill="#3B82F6" fillOpacity="0.2" className="animate-ping" />
            <circle cx="0" cy="0" r="7" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2" />
            <circle cx="0" cy="0" r="2.5" fill="#FFFFFF" />
          </g>
        </svg>
      </div>

      {/* Bottom Range Zoom Controls */}
      <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1.5 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-800">
        <button
          onClick={zoomIn}
          title="Zoom In Radar Range"
          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 flex items-center justify-center transition"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={zoomOut}
          title="Zoom Out Radar Range"
          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 flex items-center justify-center transition"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Legend & Stats */}
      <div className="absolute bottom-3 left-3 z-10 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-3">
        <span className="font-mono text-slate-200">
          Range: {maxRangeM >= 1000 ? `${maxRangeM / 1000} km` : `${maxRangeM} m`}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span>{incidents.filter((i) => i.severity === 4).length} Critical</span>
        </span>
      </div>
    </div>
  );
};
