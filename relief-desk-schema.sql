-- =====================================================================
-- RELIEF DESK: COMPLETE DATABASE (one file, replaces the earlier two)
-- Run in Supabase: SQL Editor > New query > paste ALL > Run.
-- Safe to run on a new project OR on one that already has the old tables:
-- section 0 removes the old Relief Desk tables first (their data is lost).
-- =====================================================================

-- 0. CLEAN START (removes any earlier Relief Desk tables) -------------
drop trigger if exists on_auth_user_created on auth.users;
drop policy  if exists "photos upload" on storage.objects;
drop policy  if exists "photos read"   on storage.objects;
drop view    if exists incident_stats, low_stock;
drop table   if exists missing_persons, help_requests, push_subscriptions, alerts,
                       supply_transactions, supplies, shelter_checkins, shelters,
                       incident_media, incident_updates, incident_confirmations,
                       incidents, profiles cascade;
drop function if exists find_duplicate(text, float8, float8, text) cascade;
drop function if exists nearby_incidents(float8, float8, float8) cascade;
drop function if exists merge_incident(uuid, uuid) cascade;
drop function if exists search_missing(text) cascade;
drop function if exists app_role() cascade;
drop function if exists is_responder() cascade;
drop function if exists is_staff() cascade;
drop function if exists handle_new_user() cascade;
drop function if exists set_updated_at() cascade;
drop function if exists bump_confirmations() cascade;
drop function if exists log_incident_change() cascade;
drop function if exists apply_checkin() cascade;
drop function if exists apply_supply_tx() cascade;
drop function if exists help_fulfilled_stamp() cascade;
drop type if exists help_category cascade;
drop type if exists incident_status cascade;
drop type if exists user_role cascade;

-- 1. EXTENSIONS ------------------------------------------------------
create extension if not exists postgis with schema extensions;   -- maps / distance
create extension if not exists pg_trgm with schema extensions;   -- text similarity

-- 2. ENUMS -----------------------------------------------------------
create type user_role       as enum ('citizen','volunteer','coordinator','admin');
create type incident_status as enum ('reported','verified','responding','resolved');
create type help_category   as enum ('water','food','medical','rescue','shelter','transport','other');

-- 3. PROFILES --------------------------------------------------------
create table profiles (
  id         uuid primary key references auth.users on delete cascade,
  full_name  text,
  phone      text,
  role       user_role not null default 'citizen',
  language   text not null default 'en',
  created_at timestamptz not null default now()
);

create or replace function app_role() returns user_role
language sql stable security definer set search_path = public as $$
  select coalesce((select role from profiles where id = auth.uid()), 'citizen'::user_role)
$$;
create or replace function is_responder() returns boolean
language sql stable as $$ select app_role() in ('volunteer','coordinator','admin') $$;
create or replace function is_staff() returns boolean
language sql stable as $$ select app_role() in ('coordinator','admin') $$;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

create or replace function set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- 4. INCIDENTS -------------------------------------------------------
create table incidents (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null unique default gen_random_uuid(),
  type            text not null check (type in ('Flood','Fire','Earthquake','Cyclone damage',
                    'Landslide','Road blockage','Medical emergency','Power outage','Emergency SOS','Other')),
  severity        smallint not null default 2 check (severity between 1 and 4),
  status          incident_status not null default 'reported',
  description     text,
  address_label   text,
  people_affected int not null default 0 check (people_affected >= 0),
  location        geography(Point,4326) not null,
  is_sos          boolean not null default false,
  confirmations   int not null default 1,
  duplicate_of    uuid references incidents(id),
  reported_by     uuid references profiles(id) default auth.uid(),
  assigned_to     uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  resolved_at     timestamptz,
  deleted_at      timestamptz
);
create index incidents_location_gix on incidents using gist (location);
create index incidents_desc_trgm    on incidents using gin (description extensions.gin_trgm_ops);
create index incidents_open_idx     on incidents (severity desc, created_at desc)
  where status <> 'resolved' and deleted_at is null;
create trigger incidents_updated before update on incidents
  for each row execute function set_updated_at();

-- 5. CONFIRMATIONS ---------------------------------------------------
create table incident_confirmations (
  incident_id uuid not null references incidents(id) on delete cascade,
  user_id     uuid not null references profiles(id) default auth.uid(),
  note        text,
  created_at  timestamptz not null default now(),
  primary key (incident_id, user_id)
);
create or replace function bump_confirmations() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update incidents set confirmations = confirmations + 1 where id = new.incident_id;
  return new;
end $$;
create trigger confirmations_bump after insert on incident_confirmations
  for each row execute function bump_confirmations();

-- 6. INCIDENT TIMELINE -----------------------------------------------
create table incident_updates (
  id          bigint generated always as identity primary key,
  incident_id uuid not null references incidents(id) on delete cascade,
  author      uuid references profiles(id),
  kind        text not null check (kind in ('status_change','note','assignment')),
  old_status  incident_status,
  new_status  incident_status,
  note        text,
  created_at  timestamptz not null default now()
);
create index on incident_updates (incident_id, created_at desc);

create or replace function log_incident_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into incident_updates (incident_id, author, kind, old_status, new_status)
    values (new.id, auth.uid(), 'status_change', old.status, new.status);
    new.resolved_at := case when new.status = 'resolved' then now() else null end;
  end if;
  if new.assigned_to is distinct from old.assigned_to then
    insert into incident_updates (incident_id, author, kind, note)
    values (new.id, auth.uid(), 'assignment', 'Assigned to ' || coalesce(new.assigned_to::text,'nobody'));
  end if;
  return new;
end $$;
create trigger incidents_log before update on incidents
  for each row execute function log_incident_change();

-- 7. PHOTOS ----------------------------------------------------------
create table incident_media (
  id           uuid primary key default gen_random_uuid(),
  incident_id  uuid not null references incidents(id) on delete cascade,
  storage_path text not null,
  uploaded_by  uuid references profiles(id) default auth.uid(),
  created_at   timestamptz not null default now()
);
insert into storage.buckets (id, name, public) values ('incident-photos','incident-photos', false)
  on conflict (id) do nothing;

-- 8. SHELTERS + CHECK-INS --------------------------------------------
create table shelters (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  address       text,
  location      geography(Point,4326),
  capacity      int not null check (capacity > 0),
  occupied      int not null default 0 check (occupied >= 0),
  contact_phone text,
  amenities     text[] default '{}',
  is_open       boolean not null default true,
  updated_at    timestamptz not null default now(),
  constraint occupied_within_capacity check (occupied <= capacity)
);
create index shelters_location_gix on shelters using gist (location);
create trigger shelters_updated before update on shelters
  for each row execute function set_updated_at();

create table shelter_checkins (
  id             uuid primary key default gen_random_uuid(),
  shelter_id     uuid not null references shelters(id) on delete cascade,
  person_name    text,
  headcount      int not null default 1 check (headcount > 0),
  checked_in_at  timestamptz not null default now(),
  checked_out_at timestamptz,
  recorded_by    uuid references profiles(id) default auth.uid()
);
create or replace function apply_checkin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update shelters set occupied = occupied + new.headcount where id = new.shelter_id;
  elsif old.checked_out_at is null and new.checked_out_at is not null then
    update shelters set occupied = greatest(0, occupied - new.headcount) where id = new.shelter_id;
  end if;
  return new;
end $$;
create trigger checkins_apply after insert or update on shelter_checkins
  for each row execute function apply_checkin();

-- 9. SUPPLIES + TRANSACTIONS -----------------------------------------
create table supplies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  unit       text default 'units',
  qty        int not null default 0 check (qty >= 0),
  min_qty    int not null default 0 check (min_qty >= 0),
  shelter_id uuid references shelters(id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger supplies_updated before update on supplies
  for each row execute function set_updated_at();

create table supply_transactions (
  id          bigint generated always as identity primary key,
  supply_id   uuid not null references supplies(id) on delete cascade,
  delta       int not null check (delta <> 0),
  reason      text,
  incident_id uuid references incidents(id),
  created_by  uuid references profiles(id) default auth.uid(),
  created_at  timestamptz not null default now()
);
create or replace function apply_supply_tx() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update supplies set qty = qty + new.delta where id = new.supply_id;
  return new;
end $$;
create trigger supply_tx_apply after insert on supply_transactions
  for each row execute function apply_supply_tx();

-- 10. ALERTS + PUSH --------------------------------------------------
create table alerts (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text,
  severity   smallint not null default 2 check (severity between 1 and 4),
  center     geography(Point,4326),
  radius_m   int,
  created_by uuid references profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create index alerts_center_gix on alerts using gist (center);

create table push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade default auth.uid(),
  endpoint   text not null unique,
  keys       jsonb not null,
  created_at timestamptz not null default now()
);

-- 11. HELP REQUESTS --------------------------------------------------
create table help_requests (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null unique default gen_random_uuid(),
  category      help_category not null,
  urgency       smallint not null default 2 check (urgency between 1 and 4),
  details       text,
  people_count  int not null default 1 check (people_count > 0),
  contact_phone text,
  location      geography(Point,4326) not null,
  status        text not null default 'open'
                check (status in ('open','matched','in_progress','fulfilled','cancelled')),
  requested_by  uuid references profiles(id) default auth.uid(),
  assigned_to   uuid references profiles(id),
  shelter_id    uuid references shelters(id),
  incident_id   uuid references incidents(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  fulfilled_at  timestamptz
);
create index help_requests_location_gix on help_requests using gist (location);
create index help_requests_open_idx on help_requests (urgency desc, created_at desc)
  where status in ('open','matched','in_progress');
create trigger help_requests_updated before update on help_requests
  for each row execute function set_updated_at();

create or replace function help_fulfilled_stamp() returns trigger
language plpgsql as $$
begin
  new.fulfilled_at := case when new.status = 'fulfilled' then now() else null end;
  return new;
end $$;
create trigger help_requests_stamp before update of status on help_requests
  for each row execute function help_fulfilled_stamp();

-- 12. MISSING / FOUND PERSONS ----------------------------------------
create table missing_persons (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null unique default gen_random_uuid(),
  kind               text not null check (kind in ('missing','found')),
  full_name          text not null,
  age_approx         int check (age_approx between 0 and 120),
  gender             text,
  description        text,
  photo_path         text,
  last_seen_location geography(Point,4326),
  last_seen_at       timestamptz,
  contact_phone      text,
  status             text not null default 'open' check (status in ('open','reunited','closed')),
  reported_by        uuid references profiles(id) default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index missing_name_trgm on missing_persons using gin (full_name extensions.gin_trgm_ops);
create trigger missing_updated before update on missing_persons
  for each row execute function set_updated_at();

-- 13. FUNCTIONS FOR THE APP ------------------------------------------
create or replace function find_duplicate(p_type text, p_lng float8, p_lat float8, p_desc text default '')
returns table (id uuid, type text, description text, distance_m float8, text_score real, confirmations int)
language sql stable set search_path = public, extensions as $$
  select i.id, i.type, i.description,
         ST_Distance(i.location, pt.g) as distance_m,
         similarity(coalesce(i.description,''), coalesce(p_desc,'')) as text_score,
         i.confirmations
  from incidents i,
       (select ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography as g) pt
  where i.deleted_at is null and i.status <> 'resolved'
    and ( (i.type = p_type and ST_DWithin(i.location, pt.g, 300))
       or (ST_DWithin(i.location, pt.g, 1000)
           and similarity(coalesce(i.description,''), coalesce(p_desc,'')) >= 0.5) )
  order by distance_m
  limit 3;
$$;

create or replace function nearby_incidents(p_lng float8, p_lat float8, p_radius_m float8 default 5000)
returns table (id uuid, type text, severity smallint, status incident_status,
               lng float8, lat float8, confirmations int, distance_m float8, created_at timestamptz)
language sql stable set search_path = public, extensions as $$
  select i.id, i.type, i.severity, i.status,
         ST_X(i.location::geometry), ST_Y(i.location::geometry),
         i.confirmations,
         ST_Distance(i.location, ST_SetSRID(ST_MakePoint(p_lng,p_lat),4326)::geography),
         i.created_at
  from incidents i
  where i.deleted_at is null and i.status <> 'resolved'
    and ST_DWithin(i.location, ST_SetSRID(ST_MakePoint(p_lng,p_lat),4326)::geography, p_radius_m)
  order by i.severity desc, i.created_at desc;
$$;

create or replace function merge_incident(p_duplicate uuid, p_target uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'Only coordinators can merge incidents'; end if;
  update incidents t set confirmations = t.confirmations + d.confirmations,
         people_affected = greatest(t.people_affected, d.people_affected),
         severity = greatest(t.severity, d.severity)
  from incidents d where t.id = p_target and d.id = p_duplicate;
  update incidents set duplicate_of = p_target, deleted_at = now() where id = p_duplicate;
end $$;

create or replace function search_missing(p_query text)
returns table (id uuid, kind text, full_name text, age_approx int, gender text,
               description text, photo_path text, last_seen_at timestamptz, status text)
language sql stable security definer set search_path = public, extensions as $$
  select m.id, m.kind, m.full_name, m.age_approx, m.gender, m.description,
         m.photo_path, m.last_seen_at, m.status
  from missing_persons m
  where m.status = 'open'
    and (m.full_name ilike '%' || p_query || '%' or similarity(m.full_name, p_query) > 0.3)
  order by similarity(m.full_name, p_query) desc
  limit 20;
$$;

create view incident_stats with (security_invoker = true) as
select count(*) filter (where status <> 'resolved')                  as open_incidents,
       count(*) filter (where status <> 'resolved' and severity = 4) as critical,
       count(*) filter (where status = 'responding')                 as responding,
       count(*) filter (where status = 'resolved')                   as resolved
from incidents where deleted_at is null;

create view low_stock with (security_invoker = true) as
select id, name, qty, min_qty, (min_qty - qty) as shortfall from supplies where qty < min_qty;

-- 14. ROW-LEVEL SECURITY ---------------------------------------------
alter table profiles               enable row level security;
alter table incidents              enable row level security;
alter table incident_confirmations enable row level security;
alter table incident_updates       enable row level security;
alter table incident_media         enable row level security;
alter table shelters               enable row level security;
alter table shelter_checkins       enable row level security;
alter table supplies               enable row level security;
alter table supply_transactions    enable row level security;
alter table alerts                 enable row level security;
alter table push_subscriptions     enable row level security;
alter table help_requests          enable row level security;
alter table missing_persons        enable row level security;

create policy "profiles read"   on profiles for select to authenticated using (id = auth.uid() or is_staff());
create policy "profiles update" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = app_role());
create policy "profiles admin"  on profiles for all to authenticated
  using (app_role() = 'admin') with check (app_role() = 'admin');

create policy "incidents read"   on incidents for select to authenticated using (deleted_at is null);
create policy "incidents insert" on incidents for insert to authenticated with check (reported_by = auth.uid());
create policy "incidents owner edit" on incidents for update to authenticated
  using (reported_by = auth.uid() and status = 'reported') with check (reported_by = auth.uid());
create policy "incidents responder edit" on incidents for update to authenticated
  using (is_responder()) with check (is_responder());
create policy "incidents admin delete" on incidents for delete to authenticated using (app_role() = 'admin');

create policy "confirmations read"   on incident_confirmations for select to authenticated using (true);
create policy "confirmations insert" on incident_confirmations for insert to authenticated with check (user_id = auth.uid());

create policy "updates read"   on incident_updates for select to authenticated using (true);
create policy "updates insert" on incident_updates for insert to authenticated
  with check (is_responder() and author = auth.uid());

create policy "media read"   on incident_media for select to authenticated using (true);
create policy "media insert" on incident_media for insert to authenticated with check (uploaded_by = auth.uid());

create policy "shelters read"  on shelters for select to anon, authenticated using (true);
create policy "shelters write" on shelters for all to authenticated using (is_staff()) with check (is_staff());
create policy "alerts read"    on alerts   for select to anon, authenticated
  using (expires_at is null or expires_at > now());
create policy "alerts write"   on alerts   for insert to authenticated with check (is_staff());

create policy "checkins read"   on shelter_checkins for select to authenticated using (is_responder());
create policy "checkins insert" on shelter_checkins for insert to authenticated with check (is_responder());
create policy "checkins update" on shelter_checkins for update to authenticated using (is_responder());

create policy "supplies read"   on supplies for select to authenticated using (is_responder());
create policy "supplies write"  on supplies for all to authenticated using (is_staff()) with check (is_staff());
create policy "supply tx read"  on supply_transactions for select to authenticated using (is_responder());
create policy "supply tx add"   on supply_transactions for insert to authenticated with check (is_responder());

create policy "push own" on push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "help read"   on help_requests for select to authenticated
  using (requested_by = auth.uid() or is_responder());
create policy "help insert" on help_requests for insert to authenticated
  with check (requested_by = auth.uid());
create policy "help owner cancel" on help_requests for update to authenticated
  using (requested_by = auth.uid() and status = 'open') with check (requested_by = auth.uid());
create policy "help responder update" on help_requests for update to authenticated
  using (is_responder()) with check (is_responder());

create policy "missing read"   on missing_persons for select to authenticated
  using (reported_by = auth.uid() or is_responder());
create policy "missing insert" on missing_persons for insert to authenticated
  with check (reported_by = auth.uid());
create policy "missing owner update" on missing_persons for update to authenticated
  using (reported_by = auth.uid()) with check (reported_by = auth.uid());
create policy "missing responder update" on missing_persons for update to authenticated
  using (is_responder()) with check (is_responder());

create policy "photos upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'incident-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos read" on storage.objects for select to authenticated
  using (bucket_id = 'incident-photos');

-- 15. REALTIME -------------------------------------------------------
do $$
begin
  begin alter publication supabase_realtime add table incidents;              exception when others then null; end;
  begin alter publication supabase_realtime add table incident_confirmations; exception when others then null; end;
  begin alter publication supabase_realtime add table shelters;               exception when others then null; end;
  begin alter publication supabase_realtime add table supplies;               exception when others then null; end;
  begin alter publication supabase_realtime add table alerts;                 exception when others then null; end;
  begin alter publication supabase_realtime add table help_requests;          exception when others then null; end;
end $$;

-- 16. PROFILES FOR PEOPLE WHO ALREADY SIGNED UP ----------------------
insert into profiles (id) select id from auth.users on conflict (id) do nothing;

-- 17. SAMPLE DATA (change the coordinates to your area) --------------
insert into shelters (name, address, location, capacity, occupied, amenities) values
 ('Government School Hall', 'Main Road',      ST_SetSRID(ST_MakePoint(78.9629,20.5937),4326)::geography, 200, 134, '{water,toilets,medical}'),
 ('Community Centre',       'Ward 2',         ST_SetSRID(ST_MakePoint(78.9660,20.5950),4326)::geography,  80,  78, '{water,toilets}'),
 ('Stadium Indoor Court',   'Sports Complex', ST_SetSRID(ST_MakePoint(78.9600,20.5900),4326)::geography, 350,  40, '{water,toilets,kitchen}');
insert into supplies (name, unit, qty, min_qty) values
 ('Drinking water','litres',1200,1000), ('Food packets','packets',640,500),
 ('Blankets','pieces',90,150), ('First-aid kits','kits',45,30);

-- AFTER RUNNING:
--  * Authentication > Providers: enable Email and "Anonymous sign-ins".
--  * Make yourself admin (after you have signed up in the app):
--      update profiles set role = 'admin' where id = '<your user id>';
