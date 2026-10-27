import { db } from '@/db/dexie';
import { supabase } from '@/lib/supabase';
import { Incident, IncidentType, DuplicateMatch } from '@/types/database';

/**
 * Calculates trigram similarity between two strings, matching PostgreSQL pg_trgm.
 * Each string is padded with two leading spaces and one trailing space,
 * then split into all 3-character substrings.
 * Similarity = size(setA ∩ setB) / size(setA ∪ setB).
 */
export function trigramSimilarity(str1?: string | null, str2?: string | null): number {
  const s1 = (str1 || '').trim().toLowerCase();
  const s2 = (str2 || '').trim().toLowerCase();

  if (!s1 && !s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  if (s1 === s2) return 1.0;

  const getTrigrams = (s: string): Set<string> => {
    const padded = `  ${s} `;
    const trigrams = new Set<string>();
    for (let i = 0; i <= padded.length - 3; i++) {
      trigrams.add(padded.substring(i, i + 3));
    }
    return trigrams;
  };

  const set1 = getTrigrams(s1);
  const set2 = getTrigrams(s2);

  let intersection = 0;
  for (const tri of set1) {
    if (set2.has(tri)) {
      intersection++;
    }
  }

  const union = set1.size + set2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Calculates Great-Circle distance in meters between two (lng, lat) coordinates
 * using the Haversine formula.
 */
export function haversineDistanceM(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number
): number {
  const R = 6371e3; // Earth's mean radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lng2 - lng1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Detects duplicates against an array of locally cached incidents.
 * Applies the exact rules from SQL find_duplicate():
 * 1. deleted_at is null and status <> 'resolved'
 * 2. Either:
 *    - Same incident type AND distance <= 300 meters
 *    - OR distance <= 1000 meters AND description similarity >= 0.5
 * Returns top 3 matches sorted by distance ascending.
 */
export function findOfflineDuplicates(params: {
  type: IncidentType;
  lng: number;
  lat: number;
  description?: string | null;
  cachedIncidents: Incident[];
}): DuplicateMatch[] {
  const { type, lng, lat, description, cachedIncidents } = params;

  const matches: DuplicateMatch[] = [];

  for (const inc of cachedIncidents) {
    // Skip resolved or deleted incidents
    if (inc.deleted_at || inc.status === 'resolved') {
      continue;
    }

    if (typeof inc.lng !== 'number' || typeof inc.lat !== 'number') {
      continue;
    }

    const distance_m = haversineDistanceM(lng, lat, inc.lng, inc.lat);
    const text_score = trigramSimilarity(description, inc.description);

    const isSameTypeWithin300 = inc.type === type && distance_m <= 300;
    const isSimilarWithin1000 = distance_m <= 1000 && text_score >= 0.5;

    if (isSameTypeWithin300 || isSimilarWithin1000) {
      matches.push({
        id: inc.id,
        type: inc.type,
        description: inc.description,
        distance_m,
        text_score,
        confirmations: inc.confirmations || 1,
      });
    }
  }

  // Sort by distance ascending and return up to 3
  matches.sort((a, b) => a.distance_m - b.distance_m);
  return matches.slice(0, 3);
}

/**
 * Main duplicate detection entry point:
 * Calls find_duplicate() RPC on Supabase if online,
 * otherwise compares against IndexedDB cached incidents using offline rules.
 */
export async function detectDuplicates(params: {
  type: IncidentType;
  lng: number;
  lat: number;
  description?: string | null;
  isOnline: boolean;
}): Promise<DuplicateMatch[]> {
  const { type, lng, lat, description, isOnline } = params;

  // 1. If online, attempt RPC call first
  if (isOnline) {
    try {
      const { data, error } = await supabase.rpc('find_duplicate', {
        p_type: type,
        p_lng: lng,
        p_lat: lat,
        p_desc: description || '',
      });

      if (!error && Array.isArray(data)) {
        return data.map((row: any) => ({
          id: row.id,
          type: row.type,
          description: row.description,
          distance_m: Math.round(row.distance_m),
          text_score: row.text_score,
          confirmations: row.confirmations || 1,
        }));
      }
      if (error) {
        console.warn('find_duplicate RPC returned error, falling back to local cache:', error.message);
      }
    } catch (err) {
      console.warn('Network error calling find_duplicate RPC, using local cache:', err);
    }
  }

  // 2. Offline fallback: check against IndexedDB cached incidents
  try {
    const cached = await db.incidents.toArray();
    return findOfflineDuplicates({
      type,
      lng,
      lat,
      description,
      cachedIncidents: cached,
    });
  } catch (dbErr) {
    console.error('Failed to read local incidents for duplicate detection:', dbErr);
    return [];
  }
}
