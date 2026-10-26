import { describe, it, expect } from 'vitest';
import Supercluster from 'supercluster';
import { Incident } from '@/types/database';

describe('Incident Filtering Logic', () => {
  const sampleIncidents: Partial<Incident>[] = [
    {
      id: '1',
      type: 'Flood',
      severity: 3,
      status: 'reported',
      description: 'Water rising rapidly near bridge',
      address_label: 'Bridge Road',
    },
    {
      id: '2',
      type: 'Fire',
      severity: 4,
      status: 'responding',
      description: 'Warehouse fire in industrial zone',
      address_label: 'Factory Lane',
    },
    {
      id: '3',
      type: 'Road blockage',
      severity: 1,
      status: 'resolved',
      description: 'Fallen tree cleared by residents',
      address_label: 'Park Avenue',
    },
  ];

  it('filters active incidents (excluding resolved)', () => {
    const active = sampleIncidents.filter((inc) => inc.status !== 'resolved');
    expect(active.length).toBe(2);
    expect(active.map((i) => i.id)).toEqual(['1', '2']);
  });

  it('filters by incident type', () => {
    const fires = sampleIncidents.filter((inc) => inc.type === 'Fire');
    expect(fires.length).toBe(1);
    expect(fires[0].id).toBe('2');
  });

  it('filters by severity rating', () => {
    const critical = sampleIncidents.filter((inc) => inc.severity === 4);
    expect(critical.length).toBe(1);
    expect(critical[0].type).toBe('Fire');
  });

  it('searches by keyword matching description and address', () => {
    const query = 'bridge';
    const matches = sampleIncidents.filter(
      (inc) =>
        inc.description?.toLowerCase().includes(query) ||
        inc.address_label?.toLowerCase().includes(query)
    );
    expect(matches.length).toBe(1);
    expect(matches[0].id).toBe('1');
  });
});

describe('Supercluster Geo Clustering', () => {
  it('clusters adjacent points into single cluster group', () => {
    const cluster = new Supercluster({
      radius: 40,
      maxZoom: 16,
    });

    const points = [
      {
        type: 'Feature' as const,
        properties: { cluster: false, incidentId: '1' },
        geometry: { type: 'Point' as const, coordinates: [78.962, 20.593] },
      },
      {
        type: 'Feature' as const,
        properties: { cluster: false, incidentId: '2' },
        geometry: { type: 'Point' as const, coordinates: [78.9621, 20.5931] },
      },
      {
        type: 'Feature' as const,
        properties: { cluster: false, incidentId: '3' },
        geometry: { type: 'Point' as const, coordinates: [79.5, 21.0] },
      },
    ];

    cluster.load(points);

    // At zoom level 10, nearby points should cluster together
    const clusters = cluster.getClusters([78.0, 20.0, 80.0, 22.0], 10);
    expect(clusters.length).toBe(2);

    const clusterGroup = clusters.find((c) => c.properties.cluster);
    expect(clusterGroup).toBeDefined();
    expect(clusterGroup?.properties.point_count).toBe(2);
  });
});
