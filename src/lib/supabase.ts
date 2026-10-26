import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL or Anon Key is missing. Please check your .env configuration.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

/**
 * Format longitude and latitude into PostGIS WKT string representation
 * geography(Point, 4326) expects SRID=4326;POINT(lng lat)
 */
export function formatPoint(lng: number, lat: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}

/**
 * Parse coordinates from PostGIS geography or GeoJSON Point
 */
export function parsePoint(point: any): { lng: number; lat: number } | null {
  if (!point) return null;

  if (typeof point === 'string') {
    // Check WKT: POINT(lng lat) or SRID=4326;POINT(lng lat)
    const match = point.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (match) {
      return {
        lng: parseFloat(match[1]),
        lat: parseFloat(match[2]),
      };
    }
  }

  // GeoJSON object format { type: 'Point', coordinates: [lng, lat] }
  if (point.type === 'Point' && Array.isArray(point.coordinates)) {
    return {
      lng: point.coordinates[0],
      lat: point.coordinates[1],
    };
  }

  // Object with lng/lat or x/y
  if (typeof point.lng === 'number' && typeof point.lat === 'number') {
    return { lng: point.lng, lat: point.lat };
  }

  return null;
}

/**
 * Generates a standard UUID v4 for idempotency and offline reconciliation
 */
export function generateClientId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID generator if crypto.randomUUID is unavailable
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
