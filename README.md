# Structure Timerboard

## Generate Full Map Data From EVE SDE

The map data can be generated directly from the official EVE static data download:

1. Run:

```bash
npm run generate:map-data
```

This script downloads the current JSONL archive from [developers.eveonline.com/static-data](https://developers.eveonline.com/static-data), reads `mapRegions.jsonl`, `mapSolarSystems.jsonl`, and `mapStargates.jsonl`, and generates:

- `src/data/map.generated.ts` with complete `REGION_POSITIONS`, `REGION_SYSTEMS`, `REGION_EDGES`, and inter-region `REGION_CONNECTIONS`.

If generated data is not present, the app falls back to a built-in subset.

## Timer API + SSE Integration

The app can optionally load timers from an API snapshot and subscribe to live updates.

Set environment variables:

```bash
VITE_TIMERS_API_URL=https://your-api.example.com/timers
VITE_TIMERS_SSE_URL=https://your-api.example.com/timers/stream
```

Schema and event formats are documented in `docs/timer-api-schema.md`.

# Rsbuild project

## Setup

Install the dependencies:

```bash
npm install
```

## Get started

Start the dev server, and the app will be available at [http://localhost:3000](http://localhost:3000).

```bash
npm run dev
```

Build the app for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Learn more

To learn more about Rsbuild, check out the following resources:

- [Rsbuild documentation](https://rsbuild.rs) - explore Rsbuild features and APIs.
- [Rsbuild GitHub repository](https://github.com/web-infra-dev/rsbuild) - your feedback and contributions are welcome!
