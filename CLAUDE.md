# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SpotCheck: a mobile-first web app showing real-time-ish "how busy is it" and vibe info for UW-Madison study spots (libraries, unions, etc.), centered on a Mapbox map. Full product spec lives in `spotcheck_PRD.md`; the working sprint checklist (kept in sync with actual repo state) is `spotcheck_TASKS.md`. Both are local planning docs, not app code.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — typecheck (`tsc -b`) then production build via Vite
- `npm run lint` — ESLint over the whole repo
- `npm run preview` — serve the production build locally

There is no test suite configured yet (no test script, no test runner installed).

Requires `VITE_MAPBOX_TOKEN` set in `.env` (see `.env.example`) for the map to render tiles locally. `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are reserved for Sprint 4 and currently unused by any code.

## Architecture

**Data-access seam is the core architectural rule.** All data reads go through `src/lib/data.ts` (`getLocations()`, `getVibeTags()`), which currently proxies to hardcoded arrays in `src/lib/mockData.ts`. Components and views must import only from `src/lib/data.ts`, never from `mockData.ts` directly. This is intentional: the plan (PRD §5) is to swap `data.ts`'s implementation to real Supabase queries in Sprint 4 with zero changes to any calling component. When adding a new data operation, add it to `data.ts` first, backed by mock data, even if Supabase doesn't exist yet.

**Types mirror the target Supabase schema.** `src/types/location.ts` defines `Location`, `VibeTag`, `AtmosphereScore` to match the Postgres schema described in PRD §8 (`locations`, `vibe_tags`, `location_tags`, `busy_reports` tables), so the eventual Supabase adapter is a mechanical mapping rather than a redesign. Keep this alignment when editing types.

**View structure:** `src/views/` holds top-level screens (currently just `MapView`), `src/components/` holds reusable pieces (e.g. `LocationPin`). `App.tsx` currently renders `MapView` directly with no router wired up yet, even though `react-router-dom` is an installed dependency — routing is planned for Sprint 3's bottom nav (Map/List/Saved), not yet implemented.

**Styling:** Tailwind v4 via the `@tailwindcss/vite` plugin (no separate Tailwind config file — config is CSS-based per Tailwind v4 conventions). Design tokens (background/surface colors, busy-score tier colors, etc.) are documented in `spotcheck_TASKS.md` and should be pulled from there rather than invented ad hoc — e.g. busy-score tiers are low (≤3, emerald) / moderate (4–7, amber) / high (≥8, rose), implemented in `LocationPin.tsx`'s `getBusyTier`.

**Build order (from PRD §5 / TASKS.md):** pages are built against mock data first, sprint by sprint, with Supabase integration deferred to the last sprint. When implementing a new sprint's checklist items, check `spotcheck_TASKS.md` for the current sprint's scope and the "Explicit Out of Scope" list before adding functionality beyond what's listed.
