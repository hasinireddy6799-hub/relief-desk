export type UserRole = 'citizen' | 'volunteer' | 'coordinator' | 'admin';

export type IncidentStatus = 'reported' | 'verified' | 'responding' | 'resolved';

export type HelpCategory = 'water' | 'food' | 'medical' | 'rescue' | 'shelter' | 'transport' | 'other';

export type HelpRequestStatus = 'open' | 'matched' | 'in_progress' | 'fulfilled' | 'cancelled';

export type MissingPersonKind = 'missing' | 'found';

export type MissingPersonStatus = 'open' | 'reunited' | 'closed';

export type IncidentType =
  | 'Flood'
  | 'Fire'
  | 'Earthquake'
  | 'Cyclone damage'
  | 'Landslide'
  | 'Road blockage'
  | 'Medical emergency'
  | 'Power outage'
  | 'Emergency SOS'
  | 'Other';

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  language: string;
  created_at: string;
}

export interface Incident {
  id: string;
  client_id: string;
  type: IncidentType;
  severity: 1 | 2 | 3 | 4;
  status: IncidentStatus;
  description: string | null;
  address_label: string | null;
  people_affected: number;
  location: string | { type: string; coordinates: [number, number] }; // text representation SRID=4326;POINT(lng lat)
  is_sos: boolean;
  confirmations: number;
  duplicate_of: string | null;
  reported_by: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  deleted_at: string | null;
  // Augmented coordinates
  lng?: number;
  lat?: number;
  distance_m?: number;
}

export interface IncidentConfirmation {
  incident_id: string;
  user_id: string;
  note: string | null;
  created_at: string;
}

export interface IncidentUpdate {
  id: number;
  incident_id: string;
  author: string | null;
  kind: 'status_change' | 'note' | 'assignment';
  old_status: IncidentStatus | null;
  new_status: IncidentStatus | null;
  note: string | null;
  created_at: string;
}

export interface IncidentMedia {
  id: string;
  incident_id: string;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface Shelter {
  id: string;
  name: string;
  address: string | null;
  location: string | null;
  capacity: number;
  occupied: number;
  contact_phone: string | null;
  amenities: string[];
  is_open: boolean;
  updated_at: string;
  lng?: number;
  lat?: number;
  distance_m?: number;
}

export interface ShelterCheckin {
  id: string;
  shelter_id: string;
  person_name: string | null;
  headcount: number;
  checked_in_at: string;
  checked_out_at: string | null;
  recorded_by: string | null;
}

export interface Supply {
  id: string;
  name: string;
  unit: string;
  qty: number;
  min_qty: number;
  shelter_id: string | null;
  updated_at: string;
}

export interface SupplyTransaction {
  id: number;
  supply_id: string;
  delta: number;
  reason: string | null;
  incident_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Alert {
  id: string;
  title: string;
  body: string | null;
  severity: 1 | 2 | 3 | 4;
  center: string | null;
  radius_m: number | null;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  keys: Record<string, any>;
  created_at: string;
}

export interface HelpRequest {
  id: string;
  client_id: string;
  category: HelpCategory;
  urgency: 1 | 2 | 3 | 4;
  details: string | null;
  people_count: number;
  contact_phone: string | null;
  location: string;
  status: HelpRequestStatus;
  requested_by: string | null;
  assigned_to: string | null;
  shelter_id: string | null;
  incident_id: string | null;
  created_at: string;
  updated_at: string;
  fulfilled_at: string | null;
  lng?: number;
  lat?: number;
}

export interface MissingPerson {
  id: string;
  client_id: string;
  kind: MissingPersonKind;
  full_name: string;
  age_approx: number | null;
  gender: string | null;
  description: string | null;
  photo_path: string | null;
  last_seen_location: string | null;
  last_seen_at: string | null;
  contact_phone: string | null;
  status: MissingPersonStatus;
  reported_by: string | null;
  created_at: string;
  updated_at: string;
}
