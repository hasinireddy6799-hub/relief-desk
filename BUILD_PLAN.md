# BUILD PLAN: Relief Desk (read this file fully, then follow it)

You are building Relief Desk completely by yourself: an offline-first disaster management Progressive Web App (PWA). The people running you will NOT write or edit code. Make sensible decisions, note them in PROGRESS.md, and keep going.

## 0. How to work (the free AI tier has daily limits)
- Keep a file PROGRESS.md in the repo root: stages done, what is next, decisions made, known bugs. Read it at the start of every session and update it after every stage, so work resumes cleanly the next day.
- Work in the stages in section 9. After each stage: run the app, fix errors, commit with a clear message, push to GitHub, write a one-line "what to test" in PROGRESS.md and in your reply, then STOP and wait for the word "continue".
- Prefer small targeted edits over rewriting whole files. Do not regenerate working code. Do not add features that are not listed here.
- If you hit a usage limit, update PROGRESS.md first.
- NOTE: SQL files may be in the repo root or in supabase/migrations/. Look in both places. If relief-desk-addon.sql is missing, tell the user and skip help_requests and missing_persons until it is added.

## 1. Database (already exists, do NOT create or change tables)
Supabase Postgres + PostGIS. Schema is in relief-desk-schema.sql and relief-desk-addon.sql. Read both before coding and use the exact table, column, enum and function names.

- Tables: profiles, incidents, incident_confirmations, incident_updates, incident_media, shelters, shelter_checkins, supplies, supply_transactions, alerts, push_subscriptions, help_requests, missing_persons.
- Functions: find_duplicate(p_type, p_lng, p_lat, p_desc), nearby_incidents(p_lng, p_lat, p_radius_m), merge_incident(p_duplicate, p_target), search_missing(p_query).
- Views: incident_stats, low_stock.
- Storage bucket: incident-photos (path = <user_id>/<filename>).
- Roles: citizen, volunteer, coordinator, admin. Row-level security does the real access control; the UI only hides what a role cannot use.

Rules:
- Use ONLY the anon/publishable key (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY from .env). Never use or mention a service_role key in frontend code.
- Never commit .env; create .env.example.
- Locations are geography(Point,4326): send as SRID=4326;POINT(lng lat) text on insert and read through nearby_incidents() or a lng/lat helper, because the client cannot parse raw geography.
- Every insert into incidents, help_requests, missing_persons must include a client_id (uuid generated on the device) and use upsert(..., { onConflict: 'client_id', ignoreDuplicates: true }) so offline retries never create duplicates.

## 2. Stack
React + Vite + TypeScript, Tailwind CSS, React Router, TanStack Query, @supabase/supabase-js, Dexie (IndexedDB), Leaflet + react-leaflet, vite-plugin-pwa (Workbox), react-i18next, Vitest. Bundle all fonts and icons locally (no CDN links) so the app works fully offline.

## 3. Features (all must work offline unless noted)
- **Auth:** email sign-in plus anonymous sign-in (so SOS works without signup). Roles read from profiles. The first screen never blocks emergency actions behind login.
- **Live map:** open incidents as severity-coloured pins (shape + icon + label, not colour alone), pin size grows with confirmations, clustering, realtime updates via Supabase Realtime, filter by type/severity/status, "centre on me".
- **GPS:** auto-location on load with a draggable pin; tap the map to move it; graceful manual fallback if permission is denied.
- **Incident report:** type, severity 1-4, people affected, description, optional photo (compress in the browser to about 1280 px / 200 KB before upload), landmark text. Works offline.
- **Duplicate detection:** before saving, call find_duplicate(). If a match comes back, show "Looks like an existing report (distance, N reports)" with "Add my report to it" (insert into incident_confirmations) or "Submit as new". Offline: compare against locally cached incidents using the same rules (same type within 300 m, or similar text within 1 km) and re-check against the server when syncing.
- **SOS:** big button on every screen. Tap starts a 5-second countdown with a large Cancel button (prevents accidents), then creates a Critical incident (is_sos = true, type "Emergency SOS") at the live location. Works offline and is the first item the sync engine uploads.
- **Help requests:** categories water/food/medical/rescue/shelter/transport/other, urgency, people count, phone, location. Volunteers/coordinators see a prioritised list, can claim one (assigned_to), match it to a shelter, and move status open -> matched -> in_progress -> fulfilled.
- **Missing and found persons:** report form (name, age, description, photo, last seen place/time) and a search box using search_missing(). Never show a phone number to the public; the reporter and responders see it. Add a clear privacy note and a "Contact through a coordinator" button for the public.
- **Shelters:** list and map with capacity bar, amenities, "full" state, distance from you. Volunteers do check-in/check-out through shelter_checkins (the database updates occupied; do not write occupied directly).
- **Supplies:** stock vs minimum, low-stock warning from the low_stock view, restock/use through supply_transactions (never edit qty directly).
- **Alerts:** coordinators broadcast alerts; everyone sees active alerts as a banner and an Alerts screen. Cache them for offline.
- **Incident workflow:** reported -> verified -> responding -> resolved; show the timeline from incident_updates; "I see this too" confirmation; coordinators can assign (assigned_to) and merge duplicates with merge_incident().
- **Coordinator dashboard:** numbers from incident_stats, critical list, unassigned incidents, open help requests, low stock, CSV export of incidents and help requests, and (admin only) a role management screen.
- **Languages:** react-i18next with English plus one placeholder second language file; every user-facing string goes through translation keys.
- **Low-data mode toggle:** no automatic image loading, smaller map range, sync only essential data.

## 4. Offline-first engine (the heart of the app)
- Local database (Dexie): outbox (id, table, op, payload, clientId, createdAt, attempts, lastError, status), plus cache tables for incidents, shelters, supplies, alerts, help_requests and the user's own missing-person reports. Every write goes to the outbox first, updates the local cache immediately (optimistic UI), then syncs.
- Sync triggers: app start, the browser online event, tab becoming visible, every 30 seconds while online, and Background Sync where supported.
- Rules: upload in order (SOS first, then incidents, then confirmations, photos, status changes, other items); retry with exponential backoff; mark permanently failed items and show a "Needs attention" list with a Retry button; idempotent via client_id; incident status: last write wins by timestamp; shelter occupancy and supply stock only through check-in / transaction rows (never absolute values), so two offline devices cannot overwrite each other.
- Visible state: header pill "Online / Offline, N queued"; each item shows "Queued, not synced" then "Synced"; a toast on successful reconnect sync; never lose a report silently.
- Service worker: precache the app shell; stale-while-revalidate for reads; cache map tiles the user has viewed (cache-first, capped at about 500 tiles) using a configurable VITE_TILE_URL. OpenStreetMap's public tile servers forbid bulk downloading, so do NOT prefetch large areas. If tiles are unavailable offline, fall back to a simple radar-style grid showing pins relative to the user's position.
- Installable: PWA manifest, icons, "Add to Home Screen" prompt, offline page, and an update notice when a new version is available.

## 5. UI/UX direction
Calm, high-contrast, glanceable under stress; one-handed phone use first.
- Layout: map-first home screen; bottom navigation with 5 items (Map, Report, Help, Shelters, More); floating SOS button; top status pill. Desktop: map left, list/detail right.
- Design tokens: deep navy ink, clean off-white surface, one blue accent. Severity scale: Low green, Moderate amber, High orange, Critical red, each with an icon and a text label. Dark mode and light mode. 16 px minimum body text, 44 px minimum touch targets, one type family (bundled locally), 8 px spacing grid, consistent rounded corners.
- Forms: big controls, short labels, sensible defaults, never more than one main action per screen; progressive disclosure for optional fields.
- States: friendly empty states that say what to do next, clear error messages that say how to fix, skeleton loaders, never a blank screen.
- Accessibility: WCAG AA contrast, visible keyboard focus, aria labels, screen reader announcements for sync and SOS, reduced-motion respected, colour never the only signal.
- Tone: plain language, sentence case, active verbs ("Send SOS", "Add my report"), same word for the same action everywhere.
- Motion only for meaning: the SOS countdown, critical pin pulse, sync confirmation.

## 6. Roles and what each can see
- Citizen: map, report, SOS, own help requests, missing-person search/report, shelters, alerts.
- Volunteer: plus help-request queue, "my tasks", shelter check-in/out, supply transactions.
- Coordinator: plus verify/assign/merge, broadcast alerts, dashboard, CSV export.
- Admin: plus role management.
Hide unavailable actions but rely on database policies for security.

## 7. Security and privacy
Anon key only; no secrets in the repo; validate and trim all inputs; never log personal data; ask for location consent clearly; phone numbers and missing-person contact details never shown to the public; escape all user text.

## 8. Quality
- Vitest tests for: duplicate detection (online and offline), the outbox/sync engine (retry, ordering, idempotency), and role-based routing.
- Fix any build or type errors before committing.
- README with setup, env variables, how to run, how to deploy to Vercel, and how to make the first admin.

## 9. Stages (stop after each and wait for "continue")
1. **Foundation:** project setup, folders, Supabase client, auth and roles, design tokens, app shell with bottom navigation, i18n, Dexie + empty outbox, PWA basics, status pill.
2. **Map and incidents:** map, GPS pin, incident list and report form, realtime updates, filters.
3. **Duplicates, SOS, confirmations, photos, workflow:** find_duplicate flow, SOS countdown, "I see this too", photo upload, incident timeline.
4. **Complete offline engine:** outbox sync with all rules in section 4, service worker, tile cache, offline fallback map, low-data mode, tests.
5. **Shelters, supplies, help requests.**
6. **Missing persons, alerts, volunteer "my tasks".**
7. **Coordinator dashboard:** stats, assign, merge, CSV export, role admin.
8. **Polish:** accessibility pass, dark mode check, empty/error states, second-language file, README, final tests, deploy notes.
