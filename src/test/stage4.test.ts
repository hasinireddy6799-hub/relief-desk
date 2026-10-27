import { describe, it, expect } from 'vitest';
import {
  getTablePriorityRank,
  getExponentialBackoffDelay,
} from '@/services/syncEngine';
import { OutboxItem } from '@/db/dexie';

describe('Stage 4: Outbox Sync Ordering and Priority', () => {
  it('assigns highest priority (rank 0) to SOS items', () => {
    const sosItem: OutboxItem = {
      table: 'incidents',
      op: 'INSERT',
      payload: { type: 'Emergency SOS' },
      clientId: 'c1',
      createdAt: '2026-10-27T10:00:00Z',
      attempts: 0,
      status: 'pending',
      is_sos: true,
    };
    expect(getTablePriorityRank(sosItem)).toBe(0);
  });

  it('orders tables according to spec: SOS > incidents > confirmations > media > updates', () => {
    const items: Partial<OutboxItem>[] = [
      { table: 'incident_updates', op: 'INSERT', payload: {} },
      { table: 'incident_confirmations', op: 'INSERT', payload: {} },
      { table: 'incident_media', op: 'INSERT', payload: {} },
      { table: 'incidents', op: 'INSERT', payload: { type: 'Emergency SOS' }, is_sos: true },
      { table: 'incidents', op: 'INSERT', payload: { type: 'Flood' } },
      { table: 'help_requests', op: 'INSERT', payload: {} },
    ];

    const sorted = [...items].sort((a, b) => {
      return getTablePriorityRank(a as OutboxItem) - getTablePriorityRank(b as OutboxItem);
    });

    expect(sorted[0].is_sos).toBe(true);
    expect(sorted[1].table).toBe('incidents');
    expect(sorted[2].table).toBe('incident_confirmations');
    expect(sorted[3].table).toBe('incident_media');
    expect(sorted[4].table).toBe('incident_updates');
    expect(sorted[5].table).toBe('help_requests');
  });

  it('sorts same-priority items chronologically (FIFO)', () => {
    const item1: OutboxItem = {
      table: 'incidents',
      op: 'INSERT',
      payload: { type: 'Fire' },
      clientId: 'c1',
      createdAt: '2026-10-27T10:00:00Z',
      attempts: 0,
      status: 'pending',
    };
    const item2: OutboxItem = {
      table: 'incidents',
      op: 'INSERT',
      payload: { type: 'Flood' },
      clientId: 'c2',
      createdAt: '2026-10-27T10:05:00Z',
      attempts: 0,
      status: 'pending',
    };

    const sorted = [item2, item1].sort((a, b) => {
      const rankA = getTablePriorityRank(a);
      const rankB = getTablePriorityRank(b);
      if (rankA !== rankB) return rankA - rankB;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    expect(sorted[0].clientId).toBe('c1');
    expect(sorted[1].clientId).toBe('c2');
  });
});

describe('Stage 4: Exponential Backoff Calculation', () => {
  it('returns 0ms for 0 attempts', () => {
    expect(getExponentialBackoffDelay(0)).toBe(0);
  });

  it('calculates exponential doubling delays', () => {
    expect(getExponentialBackoffDelay(1)).toBe(1000);  // 1s
    expect(getExponentialBackoffDelay(2)).toBe(2000);  // 2s
    expect(getExponentialBackoffDelay(3)).toBe(4000);  // 4s
    expect(getExponentialBackoffDelay(4)).toBe(8000);  // 8s
    expect(getExponentialBackoffDelay(5)).toBe(16000); // 16s
  });

  it('caps maximum delay at 60 seconds', () => {
    expect(getExponentialBackoffDelay(10)).toBe(60000);
    expect(getExponentialBackoffDelay(20)).toBe(60000);
  });
});

describe('Stage 4: Radar Map Bearing and Relative Math', () => {
  const userLng = 78.9629;
  const userLat = 20.5937;

  it('calculates bearing close to 0 (North) for points directly north', () => {
    const targetLng = userLng;
    const targetLat = userLat + 0.01;

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const φ1 = toRad(userLat);
    const φ2 = toRad(targetLat);
    const Δλ = toRad(targetLng - userLng);

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const bearingRad = Math.atan2(y, x);

    expect(Math.abs(bearingRad)).toBeLessThan(0.01);
  });

  it('calculates bearing close to π/2 (East) for points directly east', () => {
    const targetLng = userLng + 0.01;
    const targetLat = userLat;

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const φ1 = toRad(userLat);
    const φ2 = toRad(targetLat);
    const Δλ = toRad(targetLng - userLng);

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const bearingRad = Math.atan2(y, x);

    expect(bearingRad).toBeGreaterThan(1.5);
    expect(bearingRad).toBeLessThan(1.6);
  });
});
