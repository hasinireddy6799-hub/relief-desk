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

## What to Test
Tap any incident on the map or list to view its detail modal, test the "I see this too" confirmation button, submit a report with matching type/location to trigger the duplicate warning modal, and test the 5-second SOS countdown trigger.

## Next Stage
- **Stage 4: Complete offline engine**
  - Outbox sync engine with all rules (SOS priority, retry with exponential backoff, status ordering).
  - Permanent failure handling and "Needs attention" list with manual Retry button.
  - Service worker precaching, stale-while-revalidate for reads, and dynamic map tile caching (capped at ~500 tiles).
  - Offline radar-style grid map fallback when tiles are unavailable.
  - Low-data mode toggle (skip auto photo loading, reduce radius).
  - Vitest tests for outbox sync engine, retry ordering, and idempotency.

## Decisions Made
- Used custom Leaflet DivIcons with SVG markup rather than external image icons so map pins are 100% offline-functional without missing asset errors.
- Integrated `supercluster` for map clustering due to its zero external runtime dependencies and smooth performance.
- Implemented in-browser image compression using HTML5 Canvas to strictly adhere to the ~1280px / 200KB bandwidth-saving target without extra npm bundle bloat.
- Maintained optimistic IndexedDB writes for all incident reporting so reports appear immediately even when offline.
- Implemented client-side trigram similarity matching PostgreSQL `pg_trgm` so offline duplicate detection logic produces results identical to the server `find_duplicate()` function.
- Added Web Audio API synthesizer for countdown and SOS tones to ensure zero external media file assets are needed offline.

## Known Bugs
- None currently known.
