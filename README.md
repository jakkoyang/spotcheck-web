# SpotCheck

A map-centric web app for UW-Madison students to check real-time crowd levels, atmosphere, and amenities at campus study spots and libraries — so you can tell if a spot has seating before you walk there.

## Stack

Vite + React + TypeScript, Tailwind CSS v4, Mapbox (`react-map-gl`). Data currently comes from a typed mock dataset behind a small data-access seam (`src/lib/data.ts`), designed to swap to Supabase later without touching any component code.

## Getting started

```bash
npm install
cp .env.example .env   # then fill in VITE_MAPBOX_TOKEN
npm run dev
```

The map won't render tiles until `VITE_MAPBOX_TOKEN` is set to a real [Mapbox access token](https://account.mapbox.com/access-tokens/).

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — typecheck and build for production
- `npm run lint` — run ESLint
- `npm run preview` — serve the production build locally
