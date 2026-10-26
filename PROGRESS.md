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

## What to Test
Open the app, check bottom navigation between the 5 tabs, verify the header Online status pill, tap the floating SOS button to see the 5-second countdown with Cancel, and toggle language/sign-in in the More tab.

## Next Stage
- **Stage 2: Map and incidents**
  - Leaflet + react-leaflet interactive map setup with custom pins and clustering.
  - User GPS auto-location with draggable pin and manual fallback.
  - Incident list and reporting form with type, severity (1-4), people affected, and description.
  - Realtime subscriptions via Supabase Realtime and filter controls (type, severity, status).

## Decisions Made
- Used system font stack and bundled Lucide SVG icons directly to ensure 100% offline functionality without CDN dependencies.
- Configured `.npmrc` with `/tmp/.npm-cache` to avoid cache permissions issues.
- Integrated Dexie `useLiveQuery` to reactively update the outbox queue counter in `StatusPill`.
- Kept anonymous auth as default fallback so emergency SOS and reporting are never blocked behind an authentication wall.

## Known Bugs
- None currently known.
