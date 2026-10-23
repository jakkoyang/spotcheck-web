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

**View structure:** the app is a single map-first screen, `src/views/ExploreView.tsx` (the earlier Home/Map/Search tabs were merged into it). The map is always visible; one search bar + category/vibe chips (`SearchBar`, `FilterBar`) sit on top and drive both the pins and a draggable `BottomSheet` (peek/half/full snaps, `src/lib/sheetSnaps.ts`) that shows either the filtered spot list or the selected spot's `LocationCard`. Filtering/sorting lives in `src/lib/spotFilters.ts`; address lookup in `src/lib/usePlaceSearch.ts`. `App.tsx` routes `/` to `ExploreView` and redirects everything else there — add new routes (e.g. Saved) alongside it.

`npm run dev:mock` (`.env.mock`) blanks the Supabase env vars so `data.ts` falls back to mock data even when `.env` points at a live project.

**Mobile app (`mobile/`):** an Expo/React Native port with its own `AGENTS.md`. It mirrors the web Explore screen in `mobile/src/app/index.tsx` (`@rnmapbox/maps` + `@gorhom/bottom-sheet`), and `mobile/src/lib/{mockData,spotFilters,usePlaceSearch}.ts` are copies of the web files — keep them in sync (the mobile `usePlaceSearch` additionally sends a User-Agent, which Nominatim requires and browsers can't set). `mobile/start-native-mock.cmd` sets `EXPO_PUBLIC_USE_MOCK_DATA=1` to serve mock data (spot data only — auth still uses Supabase). Android runs edge-to-edge, so the window never resizes for the keyboard; the Explore screen handles the keyboard itself rather than relying on the bottom sheet's keyboard modes.

Shared-with-web copies also include `openingHours.ts` (evaluator for the OSM `opening_hours` subset our data uses) and `freshness.ts`. Mobile-only features — busy reports, saved spots (AsyncStorage, via `data.ts`), clustering + category-icon pins (`SpotsLayer`), walking times/Nearest (`useUserLocation`, `distance.ts`), light/dark theme (`theme.ts`; NativeWind `dark:` classes plus `useThemeColors()` for native colors), haptics, and Google/Apple sign-in (`auth.ts`, Supabase OAuth via `expo-web-browser`) — are not yet ported to web. Live busy reports need `supabase/migrations/0002_busy_reports_and_hours.sql` applied (run it before re-running `seed.sql`, which now writes `opening_hours`).

The Mapbox logo and attribution must stay visible on the map (Mapbox ToS); they sit just under the filter chips. Local Android builds need **JDK 17** (e.g. Gradle's `~/.gradle/jdks/eclipse_adoptium-17…`): Android Studio's bundled JDK 25 makes the `react-native-worklets` CMake step fail. `android/` is generated (gitignored); `expo prebuild` wipes `local.properties`, so set `ANDROID_HOME` for Gradle rather than editing it.

Mobile styling uses a semantic type scale (`text-caption`/`footnote`/`body`/`headline`/`title`, defined in `mobile/tailwind.config.js`) instead of `text-xs`/`sm`/`base`, and shadows come from `mobile/src/lib/elevation.ts` (`boxShadow`, which renders on iOS and Android) rather than `elevation`. A spot's busy color is shared by its map pin, list-row icon, `BusyBadge` and `BusyPanel` (`BusyStatus.tsx`). The icon/splash PNGs in `mobile/assets` are generated art (white pin + check on violet). Mobile's brand color is violet, including the low busy tier (labels Empty / Busy / Packed); the web app still uses emerald and the older labels. Mobile only greys out reports older than 2 h (no 30 min–2 h fade). The Explore sheet starts closed; the list opens at half and drags to full, a spot's card sizes to fit, and `enableOverDrag` stays off because dragging past the top snap leaves the sheet ignoring touches on Android.

**Styling:** Tailwind v4 via the `@tailwindcss/vite` plugin (no separate Tailwind config file — config is CSS-based per Tailwind v4 conventions). Design tokens (background/surface colors, busy-score tier colors, etc.) are documented in `spotcheck_TASKS.md` and should be pulled from there rather than invented ad hoc — e.g. busy-score tiers are low (≤3, emerald) / moderate (4–7, amber) / high (≥8, rose), implemented in `LocationPin.tsx`'s `getBusyTier`.

**Build order (from PRD §5 / TASKS.md):** pages are built against mock data first, sprint by sprint, with Supabase integration deferred to the last sprint. When implementing a new sprint's checklist items, check `spotcheck_TASKS.md` for the current sprint's scope and the "Explicit Out of Scope" list before adding functionality beyond what's listed.
