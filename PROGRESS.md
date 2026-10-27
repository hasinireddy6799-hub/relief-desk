# Relief Desk - Progress Log

## Stages Completed
- **Stage 1: Foundation** (Completed: 2026-10-27)
  - Project initialized with React 18, Vite, TypeScript, Tailwind CSS, TanStack Query, React Router v6.
  - Supabase client configured with anon key, PostGIS helpers (`formatPoint`, `parsePoint`), and client UUID generator.
  - Anonymous auth + email sign-in / registration architecture with role detection (`citizen`, `volunteer`, `coordinator`, `admin`) and local caching.
  - Design tokens established: deep navy ink (`#0B1120`), clean off-white surface (`#F8FAFC`), blue accent, 4-tier severity tokens (Low, Moderate, High, Critical), 44px minimum touch targets, WCAG AA compliance.
  - Mobile-first app shell: Top header with dynamic status pill (`Online / Offline, N queued`), bottom navigation with 5 views (Map, Report, Help, Shelters, More), floating SOS button with 5s countdown modal.
  - Dexie (IndexedDB) configured with `outbox` table and cache tables for offline-first support.
  - i18n initialized with English (`en`) and Spanish (`es`) translation catalogs.
  - PWA manifest and Workbox service worker generated.
  - Automated Vitest test suite passing (8/8 tests).

- **Stage 2: Map and incidents** (Completed: 2026-10-27)
  - Interactive Leaflet map with custom offline SVG DivIcons (shape + icon + label + dynamic size scaling with confirmations).
  - Supercluster integration for smooth zoom-dependent marker clustering and expansion.
  - User GPS geolocation hook (`useUserLocation`) with draggable pin, accuracy circle, and "Centre on me" control.
  - Realtime incident syncing via Supabase Realtime channel and Dexie local IndexedDB cache.
  - Comprehensive filters: type, severity (1-4), status (active vs all), and text search.
  - Full offline-ready incident reporting form (`/report`): type selector, severity level cards, people affected counter, landmark field, and HTML5 canvas browser-side photo compressor (~1280px / 200KB).
  - Responsive desktop split layout (map left, incident list right) and mobile toggle view.
  - Vitest test suite expanded and passing (13/13 tests).

- **Stage 3: Duplicates, SOS, confirmations, photos, workflow** (Completed: 2026-10-27)
  - Duplicate detection engine with `find_duplicate()` RPC integration and offline fallback using Haversine distance and `pg_trgm`-compatible trigram similarity.
  - Interactive `DuplicateWarningModal` with "Add my report to it" (confirmation flow) and "Submit as new incident".
  - Enhanced floating SOS emergency broadcast with 5-second countdown, Web Audio pitch cues, haptic vibration, highest-priority outbox queuing (`is_sos: true`), and automatic critical pin placement.
  - "I see this too" confirmation action with optimistic local IndexedDB counter bumps, duplicate confirmation prevention, and sync to `incident_confirmations`.
  - Photo attachment pipeline storing locally in Dexie `incident_media` and syncing to Supabase Storage `incident-photos` bucket (`<user_id>/<file_id>.jpg`).
  - Comprehensive `IncidentDetailModal` featuring situation overview, photo gallery with lightbox view, responder status workflow actions (Verify -> Responding -> Resolved), note posting, and chronological update timeline (`incident_updates`).
  - Vitest test suite expanded to 27/27 passing tests.

- **Stage 4: Complete offline engine** (Completed: 2026-10-27)
  - Full-featured background sync engine (`syncEngine.ts`) with priority ordering (SOS first, then incidents, confirmations, photos, updates, others).
  - Exponential backoff retry engine (1s, 2s, 4s, 8s, 16s, capped at 60s) with permanent failure threshold after 5 attempts.
  - Interactive `OutboxModal` ("Needs attention" and "Pending" queues) with individual retry, retry all, and dismiss capabilities, accessible from the header status pill and More page.
  - Reconnection sync toast notifications and "Queued, not synced" vs "Synced" badges on incident cards.
  - Tactical SVG `RadarMapFallback` grid with range circles (500m to 20km), compass crosshairs, and relative pin plotting for 100% offline map visualization when tiles are unavailable.
  - Workbox runtime caching in `vite.config.ts`: CacheFirst for map tiles capped at 500 entries, StaleWhileRevalidate for assets, NetworkFirst for REST.
  - Low-data mode integration: disables automatic photo downloads and shrinks query radius.
  - Vitest test suite expanded to 35/35 passing tests.

## What to Test
Click the header status pill to inspect the Outbox queue modal, tap the green radar icon on the map to switch to the tactical radar grid fallback, toggle low-data mode in More, and verify reconnection sync toasts when reconnecting online.

## Next Stage
- **Stage 5: Shelters, supplies, help requests**
  - Help request submission form and prioritized volunteer queue with status transitions (`open` -> `matched` -> `in_progress` -> `fulfilled`).
  - Shelter list and map with capacity bar, amenities, distance, and volunteer check-in / check-out through `shelter_checkins`.
  - Supplies inventory management with stock vs minimum warning (`low_stock` view) and transactions through `supply_transactions`.

## Decisions Made
- Used custom Leaflet DivIcons with SVG markup rather than external image icons so map pins are 100% offline-functional without missing asset errors.
- Integrated `supercluster` for map clustering due to its zero external runtime dependencies and smooth performance.
- Implemented in-browser image compression using HTML5 Canvas to strictly adhere to the ~1280px / 200KB bandwidth-saving target without extra npm bundle bloat.
- Maintained optimistic IndexedDB writes for all incident reporting so reports appear immediately even when offline.
- Implemented client-side trigram similarity matching PostgreSQL `pg_trgm` so offline duplicate detection logic produces results identical to the server `find_duplicate()` function.
- Added Web Audio API synthesizer for countdown and SOS tones to ensure zero external media file assets are needed offline.
- Built a tactical radar-style canvas/grid fallback so users can visually locate nearby hazards relative to their compass bearing even when no map tiles are cached or downloaded.
- Enforced strict outbox priority upload ordering (SOS always takes precedence over standard records) with client-side exponential backoff.

## Known Bugs
- None currently known.
