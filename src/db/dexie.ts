import Dexie, { Table } from 'dexie';
import {
  Incident,
  Shelter,
  Supply,
  Alert,
  HelpRequest,
  MissingPerson
} from '@/types/database';

export interface OutboxItem {
  id?: number;
  table:
    | 'incidents'
    | 'incident_confirmations'
    | 'incident_updates'
    | 'incident_media'
    | 'help_requests'
    | 'missing_persons'
    | 'shelter_checkins'
    | 'supply_transactions'
    | 'alerts';
  op: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: Record<string, any>;
  clientId: string;
  createdAt: string;
  attempts: number;
  lastError?: string | null;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  is_sos?: boolean;
}

export class ReliefDeskDatabase extends Dexie {
  outbox!: Table<OutboxItem, number>;
  incidents!: Table<Incident, string>;
  shelters!: Table<Shelter, string>;
  supplies!: Table<Supply, string>;
  alerts!: Table<Alert, string>;
  help_requests!: Table<HelpRequest, string>;
  missing_persons!: Table<MissingPerson, string>;

  constructor() {
    super('ReliefDeskDB');
    this.version(1).stores({
      outbox: '++id, table, op, clientId, status, createdAt, is_sos',
      incidents: 'id, client_id, type, severity, status, is_sos, created_at',
      shelters: 'id, name, is_open, updated_at',
      supplies: 'id, name, shelter_id, updated_at',
      alerts: 'id, severity, created_at, expires_at',
      help_requests: 'id, client_id, category, urgency, status, created_at',
      missing_persons: 'id, client_id, kind, status, created_at',
    });
  }
}

export const db = new ReliefDeskDatabase();
