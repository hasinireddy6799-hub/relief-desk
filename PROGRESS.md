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

## What to Test
Open the live map to see your GPS pin and nearby hazards, use the severity/type filters, switch between Map and List views, and submit a new report via the Report tab to verify instant local pin placement and outbox queuing.

## Next Stage
- **Stage 3: Duplicates, SOS, confirmations, photos, workflow**
  - Duplicate detection flow calling `find_duplicate()` and offline distance/text similarity comparison.
  - SOS countdown flow and emergency alert creation.
  - "I see this too" confirmation action (`incident_confirmations`).
  - Incident media photo upload to `incident-photos` bucket.
  - Incident update timeline (`incident_updates`).

## Decisions Made
- Used custom Leaflet DivIcons with SVG markup rather than external image icons so map pins are 100% offline-functional without missing asset errors.
- Integrated `supercluster` for map clustering due to its zero external runtime dependencies and smooth performance.
- Implemented in-browser image compression using HTML5 Canvas to strictly adhere to the ~1280px / 200KB bandwidth-saving target without extra npm bundle bloat.
- Maintained optimistic IndexedDB writes for all incident reporting so reports appear immediately even when offline.

## Known Bugs
- None currently known.
