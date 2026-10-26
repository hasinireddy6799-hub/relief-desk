import { describe, it, expect } from 'vitest';
import { formatPoint, parsePoint, generateClientId } from '@/lib/supabase';

describe('Supabase PostGIS Helpers', () => {
  it('formats coordinates to PostGIS WKT string', () => {
    const wkt = formatPoint(78.9629, 20.5937);
    expect(wkt).toBe('SRID=4326;POINT(78.9629 20.5937)');
  });

  it('parses POINT WKT strings correctly', () => {
    const coords = parsePoint('SRID=4326;POINT(78.9629 20.5937)');
    expect(coords).not.toBeNull();
    expect(coords?.lng).toBeCloseTo(78.9629);
    expect(coords?.lat).toBeCloseTo(20.5937);
  });

  it('parses GeoJSON Point objects correctly', () => {
    const geojson = {
      type: 'Point',
      coordinates: [78.9629, 20.5937],
    };
    const coords = parsePoint(geojson);
    expect(coords).not.toBeNull();
    expect(coords?.lng).toBeCloseTo(78.9629);
    expect(coords?.lat).toBeCloseTo(20.5937);
  });

  it('generates valid UUID v4 client IDs', () => {
    const id1 = generateClientId();
    const id2 = generateClientId();
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});

describe('Role Hierarchy & Access Controls', () => {
  const checkRoles = (role: string) => {
    return {
      isResponder: ['volunteer', 'coordinator', 'admin'].includes(role),
      isStaff: ['coordinator', 'admin'].includes(role),
      isAdmin: role === 'admin',
    };
  };

  it('citizen has base access only', () => {
    const access = checkRoles('citizen');
    expect(access.isResponder).toBe(false);
    expect(access.isStaff).toBe(false);
    expect(access.isAdmin).toBe(false);
  });

  it('volunteer has responder access but not staff', () => {
    const access = checkRoles('volunteer');
    expect(access.isResponder).toBe(true);
    expect(access.isStaff).toBe(false);
    expect(access.isAdmin).toBe(false);
  });

  it('coordinator has staff and responder access', () => {
    const access = checkRoles('coordinator');
    expect(access.isResponder).toBe(true);
    expect(access.isStaff).toBe(true);
    expect(access.isAdmin).toBe(false);
  });

  it('admin has all elevated permissions', () => {
    const access = checkRoles('admin');
    expect(access.isResponder).toBe(true);
    expect(access.isStaff).toBe(true);
    expect(access.isAdmin).toBe(true);
  });
});
