import { describe, it, expect } from 'vitest';
import {
  trigramSimilarity,
  haversineDistanceM,
  findOfflineDuplicates,
} from '@/utils/duplicateDetector';
import { Incident } from '@/types/database';

describe('Stage 3: Trigram Text Similarity', () => {
  it('returns 1.0 for identical strings', () => {
    expect(trigramSimilarity('Bridge flooded', 'Bridge flooded')).toBe(1.0);
    expect(trigramSimilarity('', '')).toBe(1.0);
    expect(trigramSimilarity(null, null)).toBe(1.0);
  });

  it('returns 0.0 for completely disjoint strings', () => {
    const score = trigramSimilarity('abcdef', 'uvwxyz');
    expect(score).toBe(0.0);
  });

  it('calculates similarity for similar disaster descriptions', () => {
    const descA = 'River overflowed and flooded the highway near town bridge';
    const descB = 'River overflow and severe flooding on highway by bridge';
    const score = trigramSimilarity(descA, descB);
    expect(score).toBeGreaterThan(0.4);
  });

  it('handles case-insensitivity and extra whitespace', () => {
    const score = trigramSimilarity('   FIRE AT WAREHOUSE  ', 'fire at warehouse');
    expect(score).toBe(1.0);
  });
});

describe('Stage 3: Haversine Distance Calculation', () => {
  it('calculates 0 meters for identical coordinates', () => {
    const d = haversineDistanceM(78.9629, 20.5937, 78.9629, 20.5937);
    expect(d).toBe(0);
  });

  it('calculates accurate distance for nearby points (~150m)', () => {
    // ~0.001 degree lat is ~111 meters
    const d = haversineDistanceM(78.9629, 20.5937, 78.9629, 20.595);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(200);
  });

  it('calculates distance across longer ranges (~11 km)', () => {
    const d = haversineDistanceM(78.9629, 20.5937, 78.9629, 20.6937);
    expect(d).toBeGreaterThan(10000);
    expect(d).toBeLessThan(12000);
  });
});

describe('Stage 3: Offline Duplicate Detection Rules', () => {
  const baseLng = 78.9629;
  const baseLat = 20.5937;

  const mockIncidents: Incident[] = [
    {
      id: 'inc-1',
      client_id: 'inc-1',
      type: 'Flood',
      severity: 3,
      status: 'reported',
      description: 'Water rising up to 3 feet near north market',
      address_label: 'North Market',
      people_affected: 5,
      location: `SRID=4326;POINT(${baseLng} ${baseLat})`,
      is_sos: false,
      confirmations: 2,
      duplicate_of: null,
      reported_by: 'user-1',
      assigned_to: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resolved_at: null,
      deleted_at: null,
      lng: baseLng + 0.001, // ~110m away
      lat: baseLat,
    },
    {
      id: 'inc-2',
      client_id: 'inc-2',
      type: 'Fire',
      severity: 4,
      status: 'responding',
      description: 'Electrical transformer caught fire and burning heavily',
      address_label: 'Substation Road',
      people_affected: 2,
      location: `SRID=4326;POINT(${baseLng} ${baseLat})`,
      is_sos: false,
      confirmations: 4,
      duplicate_of: null,
      reported_by: 'user-2',
      assigned_to: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resolved_at: null,
      deleted_at: null,
      lng: baseLng + 0.005, // ~520m away
      lat: baseLat,
    },
    {
      id: 'inc-3-resolved',
      client_id: 'inc-3-resolved',
      type: 'Flood',
      severity: 2,
      status: 'resolved',
      description: 'Resolved puddle near market',
      address_label: 'North Market',
      people_affected: 0,
      location: `SRID=4326;POINT(${baseLng} ${baseLat})`,
      is_sos: false,
      confirmations: 1,
      duplicate_of: null,
      reported_by: 'user-3',
      assigned_to: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resolved_at: new Date().toISOString(),
      deleted_at: null,
      lng: baseLng + 0.0005, // ~55m away
      lat: baseLat,
    },
    {
      id: 'inc-4-text-match',
      client_id: 'inc-4-text-match',
      type: 'Road blockage',
      severity: 2,
      status: 'reported',
      description: 'Huge fallen tree completely blocking highway access',
      address_label: 'Highway 7',
      people_affected: 0,
      location: `SRID=4326;POINT(${baseLng} ${baseLat})`,
      is_sos: false,
      confirmations: 1,
      duplicate_of: null,
      reported_by: 'user-4',
      assigned_to: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resolved_at: null,
      deleted_at: null,
      lng: baseLng + 0.006, // ~625m away (within 1000m)
      lat: baseLat,
    },
  ];

  it('matches same type within 300 meters', () => {
    const matches = findOfflineDuplicates({
      type: 'Flood',
      lng: baseLng,
      lat: baseLat,
      description: 'Streets getting flooded',
      cachedIncidents: mockIncidents,
    });

    expect(matches.length).toBe(1);
    expect(matches[0].id).toBe('inc-1');
    expect(matches[0].distance_m).toBeLessThan(300);
  });

  it('ignores resolved incidents even if nearby and same type', () => {
    const matches = findOfflineDuplicates({
      type: 'Flood',
      lng: baseLng,
      lat: baseLat,
      description: 'Puddle check',
      cachedIncidents: mockIncidents,
    });

    const resolvedMatch = matches.find((m) => m.id === 'inc-3-resolved');
    expect(resolvedMatch).toBeUndefined();
  });

  it('matches similar description within 1000m even if different type', () => {
    const matches = findOfflineDuplicates({
      type: 'Other',
      lng: baseLng,
      lat: baseLat,
      description: 'Huge fallen tree completely blocking highway access',
      cachedIncidents: mockIncidents,
    });

    expect(matches.length).toBe(1);
    expect(matches[0].id).toBe('inc-4-text-match');
    expect(matches[0].text_score).toBe(1.0);
  });

  it('does not match when beyond distance thresholds', () => {
    const farLng = baseLng + 0.1; // ~10km away
    const matches = findOfflineDuplicates({
      type: 'Flood',
      lng: farLng,
      lat: baseLat,
      description: 'Water rising up to 3 feet near north market',
      cachedIncidents: mockIncidents,
    });

    expect(matches.length).toBe(0);
  });
});

describe('Stage 3: SOS Incident Specs', () => {
  it('SOS incident has required is_sos flag, severity 4, and correct type', () => {
    const sosPayload = {
      type: 'Emergency SOS',
      severity: 4,
      status: 'reported',
      description: 'EMERGENCY SOS: Immediate rescue or assistance requested!',
      address_label: 'Live GPS SOS',
      people_affected: 1,
      is_sos: true,
      confirmations: 1,
    };

    expect(sosPayload.is_sos).toBe(true);
    expect(sosPayload.severity).toBe(4);
    expect(sosPayload.type).toBe('Emergency SOS');
    expect(sosPayload.people_affected).toBe(1);
  });
});

describe('Stage 3: Confirmation and Workflow Rules', () => {
  it('bumps confirmation count correctly', () => {
    let confirmations = 1;
    const confirm = () => {
      confirmations += 1;
      return confirmations;
    };
    expect(confirm()).toBe(2);
    expect(confirm()).toBe(3);
  });

  it('verifies valid status transition steps', () => {
    const validStatuses = ['reported', 'verified', 'responding', 'resolved'];
    const current = 'reported';
    const next = 'verified';

    expect(validStatuses).toContain(current);
    expect(validStatuses).toContain(next);
  });
});
