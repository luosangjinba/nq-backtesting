# Step 427 - V5 Chart Engine Adapter Boundary Split

Status: completed.

## Trigger

Continue V5 modularization so future chart settings, interactions, layout, and
review features do not accumulate inside a single chart-engine adapter file.

## Plan

1. Split display-context normalization and bar conversion helpers into a chart
   engine context module.
2. Split presentation/options mapping, metadata helpers, and shared range/render
   helpers into a chart engine presentation module.
3. Move the DOM fallback implementation into its own adapter module.
4. Keep the public `createChartEngineAdapter` factory and chart runtime call
   sites unchanged.
5. Run focused adapter/runtime smokes plus the full V5 smoke suite before
   commit.

## Implementation

- Added `v5/src/runtime/chart-engine-context.js` for normalized display context,
  timestamp conversion, and chart/engine bar conversion.
- Added `v5/src/runtime/chart-engine-presentation.js` for Lightweight options,
  presentation metadata, logical whitespace calculations, fallback rendering,
  and hidden debug bar rendering.
- Added `v5/src/runtime/chart-engine-fallback-adapter.js` for the DOM fallback
  adapter and fallback mouse/wheel input behavior.
- Updated `v5/src/runtime/chart-engine-adapter.js` to import the new helper
  modules and keep only the stable factory plus Lightweight adapter lifecycle.
- Updated `v5/tests/chart-engine-boundary-smoke.js` so the extracted
  presentation helper module is allowed as part of the chart-engine adapter
  family while the rest of V5 remains blocked from direct chart-engine APIs.

## Guardrails

- Chart runtime remains the only caller-side owner of chart adapter writes.
- UI and feature modules still do not call Lightweight APIs directly.
- The fallback adapter does not register app commands, subscribe to app events,
  request bars, or own replay cursor state.
- The factory contract remains `createChartEngineAdapter(...)`.

## Verification

- `node --check v5/src/runtime/chart-engine-adapter.js`
- `node --check v5/src/runtime/chart-engine-context.js`
- `node --check v5/src/runtime/chart-engine-presentation.js`
- `node --check v5/src/runtime/chart-engine-fallback-adapter.js`
- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-engine-boundary-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-fallback-input-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next

Step 428 should split the remaining Lightweight adapter internals into clearer
homes for native interaction/writeback, crosshair/readout mapping, logical range
expansion, and lifecycle wiring while keeping the factory API stable.
