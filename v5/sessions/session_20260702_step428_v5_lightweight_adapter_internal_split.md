# Step 428 - V5 Lightweight Adapter Internal Split

Status: completed.

## Trigger

Continue V5 modularization so future chart-engine work can add settings,
native interaction fixes, multi-pane sync, order markers, and review overlays
without mixing factory selection, Lightweight lifecycle, crosshair mapping, and
native input state in one file.

## Plan

1. Keep `createChartEngineAdapter(...)` as the stable public factory.
2. Move the Lightweight Charts implementation into its own adapter module.
3. Extract native drag/touch/wheel tracking and wheel settle timing into a
   helper module.
4. Extract crosshair event normalization and readout throttling into a helper
   module.
5. Update boundary documentation and harnesses so the adapter family remains
   explicit.
6. Run focused adapter/runtime/browser smokes and the full V5 smoke suite.

## Implementation

- Reduced `v5/src/runtime/chart-engine-adapter.js` to a small factory that
  selects `createLightweightInstance(...)` or `createFallbackInstance(...)`.
- Added `v5/src/runtime/chart-engine-lightweight-adapter.js` for Lightweight
  lifecycle, series/watermark setup, presentation application, visible-range
  writeback, and cleanup.
- Added `v5/src/runtime/chart-engine-lightweight-interaction.js` for native
  input markers, native interaction active/settled events, wheel settle timing,
  and recent-input detection.
- Added `v5/src/runtime/chart-engine-lightweight-crosshair.js` for crosshair
  readout mapping, bar lookup, duplicate suppression, and frame batching.
- Updated `v5/tests/chart-engine-boundary-smoke.js` so the new Lightweight
  adapter implementation is allowed as part of the chart-engine adapter family.

## Guardrails

- Chart runtime remains the only caller-side owner of chart adapter writes.
- Feature/UI modules still do not call Lightweight APIs directly.
- Lightweight helper modules do not register app commands, subscribe to app
  events, request bars, or own replay cursor state.
- The public factory contract remains `createChartEngineAdapter(...)`.

## Verification

- `node --check v5/src/runtime/chart-engine-adapter.js`
- `node --check v5/src/runtime/chart-engine-lightweight-adapter.js`
- `node --check v5/src/runtime/chart-engine-lightweight-crosshair.js`
- `node --check v5/src/runtime/chart-engine-lightweight-interaction.js`
- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-engine-boundary-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-fallback-input-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next

Step 429 should return to the remaining settings backlog with these cleaner
chart-engine boundaries in place, especially scale placement, lock
price-to-bar, no-overlap labels, countdown/session breaks, and settings
template persistence.
