# V6 Step 282 - Bar-Data Runtime Target-Timeframe Support

Date: 2026-07-10

## Decision

Step 282 adds explicit target-timeframe window support to the V6 bar-data owner.

This is still not the default display-timeframe or leftward-history path.
Target bars can now be planned, loaded, cached, released, and diagnosed through
dedicated bar-data commands, while existing source `1m` bar-data commands keep
their behavior.

## Implemented

- Added target bar window normalization and cache modules:
  - `v6/src/bar-data/target-bar-window.js`
  - `v6/src/bar-data/target-bar-window-cache.js`
- Added explicit target commands/events under bar-data:
  - `PLAN_TARGET_WINDOW`
  - `LOAD_TARGET_WINDOW`
  - `GET_TARGET_WINDOW`
  - `RELEASE_TARGET_WINDOW`
  - `GET_TARGET_CACHE_SUMMARY`
  - `TARGET_WINDOW_LOADED`
  - `TARGET_WINDOW_RELEASED`
- Wired `createBarDataRuntime` to use `v6/src/bar-data/v4-target-bars-adapter.js`
  for explicit target-window loads.
- Kept source `PLAN_WINDOW`, `LOAD_WINDOW`, `GET_WINDOW`,
  `RELEASE_WINDOW`, `GET_CACHE_SUMMARY`, and boundary metadata behavior
  unchanged.

## Preserved Boundaries

- Display-timeframe runtime does not request target bars yet.
- Chart-history leftward extension does not request target bars yet.
- Replay remains source `1m` driven.
- Chart-data, chart-viewport, chart-engine, journal, order-ticket, prop-firm,
  indicator, and seconds behavior are unchanged.

## Verification

- `node v6/tests/target-bar-window-cache-step282-smoke.js`
- `node v6/tests/bar-data-target-runtime-step282-smoke.js`
- `node v6/tests/v4-target-bars-adapter-step281-smoke.js`
- `node v6/tests/target-timeframe-domain-step280-smoke.js`
- `node v6/tests/database-bars-adapter-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 283 should begin **Display-Timeframe Historical Path Preparation**: a
bounded slice that decides how display-timeframe/chart-history will opt into
target bars, ideally behind an explicit feature path or command, without making
all high-TF switching depend on target bars in one jump.
