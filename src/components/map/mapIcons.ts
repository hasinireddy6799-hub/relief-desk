import L from 'leaflet';

/**
 * Creates custom Leaflet DivIcons with accessible shape, icon, label, and dynamic sizing
 */
export function createSeverityIcon(
  severity: 1 | 2 | 3 | 4,
  confirmations: number = 1,
  isSos: boolean = false
): L.DivIcon {
  // Pin size grows with confirmations
  let size = 34;
  if (confirmations >= 10) {
    size = 52;
  } else if (confirmations >= 6) {
    size = 46;
  } else if (confirmations >= 2) {
    size = 40;
  }

  let shapeClass = 'rounded-full'; // Low: circle
  let bgColor = '#16A34A'; // green
  let borderColor = '#DCFCE7';
  let label = 'LOW';
  let iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`;

  if (severity === 2) {
    shapeClass = 'rounded-lg'; // Moderate: rounded square
    bgColor = '#D97706'; // amber
    borderColor = '#FEF3C7';
    label = 'MOD';
    iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  } else if (severity === 3) {
    shapeClass = 'rounded-sm transform rotate-45'; // High: diamond
    bgColor = '#EA580C'; // orange
    borderColor = '#FFEDD5';
    label = 'HIGH';
    iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  } else if (severity === 4 || isSos) {
    shapeClass = 'rounded-xl'; // Critical: octagon / heavy shield
    bgColor = '#DC2626'; // red
    borderColor = '#FEE2E2';
    label = isSos ? 'SOS' : 'CRIT';
    iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  }

  const pulseHtml = isSos || severity === 4
    ? `<div class="absolute inset-0 rounded-full animate-ping bg-red-500 opacity-60"></div>`
    : '';

  const confBadge = confirmations > 1
    ? `<span class="absolute -top-1.5 -right-1.5 bg-slate-900 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full border border-white shadow">${confirmations}</span>`
    : '';

  const html = `
    <div class="relative flex items-center justify-center cursor-pointer select-none" style="width: ${size}px; height: ${size}px;">
      ${pulseHtml}
      <div class="relative flex flex-col items-center justify-center text-white shadow-lg border-2"
           style="width: ${size}px; height: ${size}px; background-color: ${bgColor}; border-color: ${borderColor}; ${shapeClass !== 'rounded-full' && severity === 3 ? 'transform: rotate(45deg);' : 'border-radius: 9999px;'}">
        <div style="${severity === 3 ? 'transform: rotate(-45deg);' : ''}" class="flex flex-col items-center justify-center leading-none">
          ${iconSvg}
          <span style="font-size: 8px; font-weight: 900; letter-spacing: 0.5px; margin-top: 1px;">${label}</span>
        </div>
      </div>
      ${confBadge}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-incident-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

/**
 * Creates user GPS location marker (pulsing radar)
 */
export function createUserLocationIcon(): L.DivIcon {
  const html = `
    <div class="relative flex items-center justify-center" style="width: 32px; height: 32px;">
      <div class="absolute inset-0 rounded-full bg-blue-500/30 animate-ping"></div>
      <div class="relative w-5 h-5 rounded-full bg-blue-600 border-3 border-white shadow-md flex items-center justify-center">
        <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-user-pin',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

/**
 * Creates Cluster marker icon
 */
export function createClusterIcon(count: number): L.DivIcon {
  let size = 36;
  let bg = '#1E293B';
  if (count > 20) {
    size = 48;
    bg = '#B91C1C';
  } else if (count > 5) {
    size = 42;
    bg = '#EA580C';
  }

  const html = `
    <div class="flex items-center justify-center rounded-full text-white font-black text-xs border-2 border-white shadow-xl cursor-pointer"
         style="width: ${size}px; height: ${size}px; background-color: ${bg};">
      <span>${count}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-cluster-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
